# UF (Unidad de Fomento) — cache diario

> **TL;DR**: una tabla `uf_rates` cachea la UF chilena por día. Un cron diario
> trae el valor desde mindicador.cl y lo upsertea. El portal usa la UF más
> reciente para mostrar `"≈ $X CLP"` al lado de los precios en UF de los
> portafolios. El portal **nunca** pega a mindicador en runtime de una request
> del usuario.

## Por qué

Los precios de las unidades del pool (Producto 2) se ingresan en **UF** vía
import del Excel y son fijos en el catálogo. Para que el inversionista vea de
forma intuitiva cuánto sería en pesos, calculamos `precio UF × valor UF` y
mostramos `"≈ $X CLP"` debajo de cada valor UF.

Hace falta una UF actualizada porque la UF se ajusta diariamente con la
inflación. Cachearla evita:

- Pegarle a mindicador.cl en cada request (degradaría latencia y nos haría
  dependientes de su uptime).
- Cargar diferentes valores entre pestañas / refreshes durante el día.

## Arquitectura

```
┌────────────────────┐         ┌─────────────────────┐
│  Cron diario       │  GET    │   mindicador.cl     │
│  /api/cron/        │ ──────► │   /api/uf           │
│  refresh-uf        │         └─────────────────────┘
└────────┬───────────┘
         │ upsert (date, valueClp)
         ▼
   ┌──────────────┐
   │  uf_rates    │  Postgres / Neon
   └──────┬───────┘
          │ getLatestUfRate()
          ▼
   ┌──────────────────────────────────────────┐
   │  Endpoints portal:                       │
   │  /api/portal/pools                       │
   │  /api/portal/pools/[slug]                │
   │  /api/portal/pool-units/[id]             │
   │                                          │
   │  Incluyen `latestUfRate` en la response  │
   └──────┬───────────────────────────────────┘
          │
          ▼
   ┌──────────────────────────────────────────┐
   │  Client Components del portal:           │
   │  pool-list, pool-detail, pool-checkout   │
   │                                          │
   │  Renderizan "≈ $X CLP" con               │
   │  `formatUfClpHint()` de @/lib/uf/format  │
   └──────────────────────────────────────────┘
```

## Tabla `uf_rates`

```prisma
model UfRate {
  id        String   @id @default(cuid())
  date      DateTime @unique @db.Date
  valueClp  Decimal  @db.Decimal(12, 2)
  source    String   @default("mindicador.cl")
  createdAt DateTime @default(now())

  @@index([date(sort: Desc)])
  @@map("uf_rates")
}
```

- `date` es **UNIQUE** → re-correr el cron el mismo día actualiza el valor sin
  crear duplicados (por si mindicador corrige durante el día).
- `valueClp` es `Decimal(12,2)` → soporta hasta 9.999.999.999,99 CLP por UF.
  Hoy la UF ronda 39.000 — margen de sobra para varias décadas.
- `source` permite migrar a otro proveedor sin perder trazabilidad histórica.

Migración: `prisma/migrations/20260515210000_add_uf_rates/migration.sql`.

## Endpoint cron

`/api/cron/refresh-uf` (GET y POST aceptados; Vercel Cron usa GET).

- **Auth**: header `Authorization: Bearer <CRON_SECRET>`. Mismo patrón que los
  otros crons del proyecto (`/api/cron/referrals/expire`, `/api/cron/db-backup`).
- Sin `CRON_SECRET` configurada → 503.
- Rate limit: bucket `webhook` (60/min por IP). Vercel Cron viene de IPs
  estables, este límite es ampliamente suficiente.
- **No está en `vercel.json`** — la cuota gratuita de Vercel Hobby permite 2
  crons y ya están ocupados por `referrals/expire` y `db-backup`. Por ahora el
  cron se dispara manualmente (ver más abajo). Cuando subamos de plan, agregar:
  ```json
  { "path": "/api/cron/refresh-uf", "schedule": "0 11 * * *" }
  ```
  (11 UTC = 7 a.m. en horario de Chile, después de que mindicador publica.)

### Disparar manualmente

```bash
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://portal.maxrent.cl/api/cron/refresh-uf
```

Respuesta esperada:

```json
{
  "ok": true,
  "date": "2026-05-15",
  "valueClp": "39458.12",
  "source": "mindicador.cl",
  "ranAt": "2026-05-15T11:00:23.123Z"
}
```

Idempotente: re-correr el mismo día actualiza el valor en lugar de duplicar.

## Service (`src/lib/services/uf.service.ts`)

API pública:

| Función | Server-only | Uso |
|---|---|---|
| `fetchUfFromMindicador(fetcher?)` | sí (HTTP I/O) | El cron pega a mindicador. `fetcher` inyectable para tests. |
| `upsertUfRate(input, source?)` | sí (Prisma) | El cron persiste idempotente. |
| `getLatestUfRate()` | sí (Prisma) | Los endpoints del portal leen el último valor cacheado. |

Helpers puros (sin Prisma) viven aparte en
`src/lib/uf/format.ts` para poder importarse desde Client Components sin
arrastrar Prisma al bundle del cliente:

| Helper | Uso |
|---|---|
| `convertUfToClp(valueUf, ufValueClp)` | Cálculo crudo, redondea al peso entero. |
| `formatClpNumber(n)` | `1234567` → `"$1.234.567"`. |
| `formatUfClpHint(valueUf, latestUfClp)` | Devuelve `"≈ $200.052.668 CLP"` o `null`. |
| `formatUfRateAsOf(dateIso)` | Devuelve `"UF al 13-may-2026"` o `null`. |

El service re-exporta `convertUfToClp` para que el caller server-side pueda
importar todo desde un solo lugar.

## Endpoints que devuelven `latestUfRate`

Los 3 endpoints del portal de pools incluyen el campo `latestUfRate` en la
response:

```ts
latestUfRate: {
  date: "2026-05-15",       // YYYY-MM-DD
  valueClp: 39458.12,
} | null
```

- `GET /api/portal/pools`
- `GET /api/portal/pools/[slug]`
- `GET /api/portal/pool-units/[id]`

Es `null` solo en el caso muy temprano post-deploy en que aún no ha corrido
ningún cron. La UI maneja `null` sin romper: simplemente no muestra el hint
`"≈ $X CLP"`.

## Comportamiento si el cron falla

- Si el cron de un día falla → los endpoints siguen usando la **última UF
  cacheada disponible** (que puede ser de ayer). La UF se mueve ~0,01%/día,
  un día de delay no afecta materialmente la cifra mostrada.
- Si mindicador devuelve un shape inesperado → el cron lanza, devuelve 500
  y no actualiza el cache. La última UF buena sigue vigente.
- Si la BD nunca tuvo un UfRate (post-deploy fresco) → `latestUfRate: null`
  → la UI no muestra hint en CLP. Esto se autocorrige al primer cron exitoso.

## Por qué no usamos el SII directamente

El SII publica la UF oficial, pero su API es engorrosa (XML / formularios
oficiales) y mindicador.cl es un agregador estable que ya sirve la UF en JSON
limpio con buen uptime. El campo `source` deja la puerta abierta a cambiar de
proveedor si mindicador deja de funcionar.

## Tests

- `src/lib/uf/format.test.ts` — cubre los helpers puros (convertUfToClp,
  formatUfClpHint, formatUfRateAsOf, formatClpNumber).
- El service no tiene tests propios porque su lógica es trivial (delega en
  Prisma + fetch) y el contrato de mindicador está documentado arriba.

## Cambios futuros

- **Si se pasa a Vercel Pro**: agregar el cron a `vercel.json`, sacar la nota
  de "ejecutar manualmente" de esta doc.
- **Histórico**: la tabla ya guarda histórico (un row por día). Útil para
  reportes / cálculos de revaluación si los pedimos en el futuro.
