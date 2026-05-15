# Producto 2 — Pool de propiedades

> Catálogo paralelo a `Property`. Cada **Pool** agrupa N **PoolUnit** (unidades individuales) que comparten cap rate, condiciones y un único Excel fuente. Los inversionistas reservan unidades específicas con el mismo flujo que Producto 1 (Mercado Pago + revisión staff).

## Por qué tablas aparte de `Property`

Las unidades del pool **no comparten lógica de catálogo con `Property`**:

- No tienen `inventoryCode`, ni metadata flexible, ni borradores con aprobación.
- El precio se **deriva** de `Valor Arriendo × 12 / capRateBruto` (no es columna manual).
- La fuente es un único Excel de operación (`LAB Capital Venta.xlsx`) que se re-importa periódicamente.
- Los estados de ocupación (`ARRENDADO`, `VACANTE`, etc.) son específicos del Excel y no aplican a `Property`.

Mantenerlas en `Property` provocaría queries cruzadas accidentales (ej. un listado de catálogo que mezcle propiedades sueltas con unidades del pool y rompa filtros). Por eso `pools` y `pool_units` viven en su propio espacio y solo se cruzan con `Reservation` (que soporta ambos targets via XOR — ver más abajo).

## Modelo de datos

Definido en [`prisma/schema.prisma`](../prisma/schema.prisma) y materializado en [`prisma/migrations/20260512200000_add_pools/migration.sql`](../prisma/migrations/20260512200000_add_pools/migration.sql).

### `Pool` (`pools`)

| Campo | Tipo | Uso |
|-------|------|-----|
| `slug` | text único | URL pública (`/oportunidades/pools/propiedades-san-miguel`). |
| `name` | text | Nombre comercial. |
| `description` | text? | Texto largo para la página del pool. |
| `status` | `PoolStatus` (`DRAFT` / `OPEN` / `CLOSED`) | Si `CLOSED` no se aceptan más reservas. |
| `acceptingReservations` | bool | Pause manual sin cambiar `status`. |
| `capRateBruto` | Decimal(5,4) | Cap rate común a todas las unidades. Ej. `0.0580`. |
| `reservationFeeClp` | Decimal(12,2) | Monto a cobrar por reserva (Mercado Pago). |
| `totalUnits`, `totalValueUf`, `totalMonthlyRentClp`, `occupancyPct` | métricas cacheadas | Se recalculan en cada import (no son fuente de verdad). |
| `metadata` | JSONB? | Espacio libre (ej. info de la ubicación, fotos del edificio). |

### `PoolUnit` (`pool_units`)

| Campo | Tipo | Uso |
|-------|------|-----|
| `poolId` | FK | Cascade delete. |
| `externalId` | text | El **`Id` del Excel** como string. Único por pool — clave para el upsert idempotente. |
| `label` | text | Etiqueta pública (`Unidad #167889 · San Miguel`). **No incluye dirección exacta.** |
| `priceUf`, `priceClp` | Decimal | Calculados: `monthlyRent × 12 / capRate`, convertidos a UF al valor del día del import. |
| `monthlyRentClp` | Decimal | Renta bruta mensual (origen: `Valor Arriendo Abril` o `Valor Arriendo`). |
| `ocupacion` | `PoolUnitOcupacion` | `ARRENDADO` / `VACANTE` / `POR_DESOCUPARSE` / `AVISO_SALIDA` / `AVISADO_PARA_DESOCUPAR` / `PUBLICADA`. |
| `comuna`, `dormitorios`, `banos`, `superficieUtilM2`, `superficieTerrazaM2` | atributos públicos | Visibles al inversionista. |
| `internalData` | JSONB | **Sensible**: `direccionExacta`, `depto`, `estadoRaw`, fila cruda. **No exponer al inversionista**. |
| `saleStatus` | `PoolUnitSaleStatus` (`AVAILABLE` / `RESERVED` / `SOLD`) | Inventario del pool. Igual que `Property.status` pero acotado. |

Constraints clave:

- `@@unique([poolId, externalId])` — upsert idempotente desde el Excel.
- `@@index([poolId, saleStatus])` — listados filtrados (disponibles vs. vendidas).

### `Reservation` admite ambos productos

Cambios en `Reservation`:

- `propertyId` ahora **nullable**.
- Nuevo `poolUnitId` (FK con `ON DELETE SET NULL`) + índice.
- Nuevo **CHECK constraint** `reservations_target_xor_check`: exactamente uno de `{propertyId, poolUnitId}` no nulo.

```sql
CHECK (
  ("propertyId" IS NOT NULL AND "poolUnitId" IS NULL)
  OR ("propertyId" IS NULL AND "poolUnitId" IS NOT NULL)
)
```

Las reservas legacy (todas con `propertyId NOT NULL` y `poolUnitId NULL`) cumplen el XOR sin tocar nada.

## Import del Excel

### Parser puro

[`src/lib/pool/lab-excel-parser.ts`](../src/lib/pool/lab-excel-parser.ts) — no depende de Prisma ni de I/O.

- `parseLabExcelRows(rows, opts)`:
  - **Filtra**: descarta filas sin `Id`, con `En Venta != "Si"` o sin valor de arriendo. Devuelve `discarded` con motivos.
  - **Calcula**: `priceClp = monthlyRent × 12 / capRateBruto`, `priceUf = priceClp / ufValueClp` (2 decimales).
  - **Normaliza**: `Id "167889.0"` → `"167889"`, `Estado` al enum (case-insensitive, default `VACANTE`).
  - **Valida**: lanza si `capRateBruto ∉ (0,1)` o `ufValueClp <= 0`.
- `computePoolMetrics(units)` — agrega `totalUnits`, `totalValueUf`, `totalMonthlyRentClp`, `occupancyPct` (% unidades en `ARRENDADO`).

Tests en [`src/lib/pool/lab-excel-parser.test.ts`](../src/lib/pool/lab-excel-parser.test.ts) (11 cases).

### Script CLI

[`scripts/import-lab-pool.ts`](../scripts/import-lab-pool.ts) — usa el parser y persiste con Prisma.

```bash
npx tsx scripts/import-lab-pool.ts \
  --xlsx ./LAB.xlsx \
  --uf 40000 \
  --slug propiedades-san-miguel \
  --name "Propiedades San Miguel" \
  --cap-rate 0.058 \
  --reservation-fee 100000 \
  [--description "..."] \
  [--dry-run]
```

- **`--dry-run`**: parsea, muestra métricas y las primeras 3 unidades, **no escribe a BD**.
- **Idempotente**: `Pool.upsert` por `slug`; cada `PoolUnit` por `(poolId, externalId)`. Re-correr el script con un Excel actualizado **actualiza** ocupaciones, rentas y métricas sin duplicar.
- **`--uf`** se pasa explícito (no se consulta API): el operador decide qué UF aplicar al import.

### Flujo operativo

1. Operación entrega `LAB.xlsx` actualizado.
2. Staff verifica el valor UF del día.
3. Corre `--dry-run` primero, revisa descartes y métricas.
4. Corre sin flag para persistir.
5. Pool queda disponible en `/oportunidades/pools/<slug>` (cuando se implemente Fase 2 UI).

## Flujo de reserva (Fase 3)

El flujo de reserva del pool **comparte infraestructura** con Producto 1 (Mercado Pago, gate de evaluación, webhook de pago).

### Contrato HTTP

`POST /api/reservations` ahora acepta XOR:

```jsonc
// Producto 1
{ "propertyId": "p_..." }
// Producto 2
{ "poolUnitId": "u_..." }
```

Validado por `reservationSchema` ([`src/lib/validations.ts`](../src/lib/validations.ts), tests en `validations.test.ts`). Mandar ambos o ninguno devuelve `400`.

`GET /api/reservations` ahora incluye `poolUnitId` + `poolUnit { externalId, label, pool { slug, name } }` para que `/reserva` pinte las reservas del pool con identidad propia (icono distinto, link al portafolio).

### Endpoints nuevos

- `GET /api/portal/pool-units/[id]` — detalle público de una unidad para la página de checkout. Devuelve `unit + pool + canReserve + investorActiveReservation`.

### Helpers de inventario (`src/lib/services/pool.service.ts`)

Análogos a los que tiene Property:

- **`markPoolUnitReservedSync(tx, poolUnitId)`** — dentro de la transacción del POST: marca el unit como `RESERVED`. Lanza si está `SOLD`.
- **`reconcilePoolUnitAfterReservationChange(poolUnitId)`** — idempotente, llamado desde el webhook de pago:
  - Hay reserva activa (`PENDING_PAYMENT`/`PAYMENT_PROCESSING`/`PAID`/`CONFIRMED`) → `RESERVED`.
  - No hay → `AVAILABLE`.
  - `SOLD` nunca se revierte por esta vía (la transición a `SOLD` la hace staff al escriturar).

### Páginas inversionista

- `/oportunidades/pools` — listado de portafolios.
- `/oportunidades/pools/[slug]` — detalle + grilla. Click en "Reservar" → siguiente página.
- `/reserva/pool-unit/[id]?from=...` — checkout: resumen de la unidad + monto de reserva + botón "Confirmar y pagar". Crea la `Reservation` y redirige a la pasarela de pago. Si el usuario ya tiene reserva activa de esa unidad, muestra estado y link a `/reserva`.
- `/reserva` — lista todas las reservas (Producto 1 + Producto 2) con identidad visual distinta.

### Pago

El `paymentService` (`createCheckout` + `handleWebhook`) ahora reconcilia **ambos** lados después de actualizar la `Reservation`: llama tanto a `reconcilePropertyAfterInvestorReservationChange(propertyId)` como a `reconcilePoolUnitAfterReservationChange(poolUnitId)`. El que no aplique recibe `null` y es no-op. Cero ramificación condicional en el caller.

### Validación E2E

Probado contra DB local con la importación real del Excel:

- Crear reserva con `poolUnitId` → `PoolUnit.saleStatus = RESERVED`.
- Reconciliar idempotente → sigue `RESERVED`.
- Cancelar reserva + reconciliar → vuelve a `AVAILABLE`.
- Escriturar reserva → `Reservation.status=CONFIRMED` + `PoolUnit.saleStatus=SOLD`.
- El CHECK constraint `reservations_target_xor_check` rechaza filas con ambos targets.

## Panel staff (Fase 4)

`/staff/pools` — listado de portafolios con métricas y badges de estado (`DRAFT` / `OPEN` / `CLOSED` / `En pausa`). El alta de un pool **no se hace desde la UI**: se corre el script CLI con un `slug` nuevo. La UI se ocupa de gestión y supervisión.

`/staff/pools/[slug]` — detalle interno. A diferencia del view inversionista:

- **Muestra `internalData`** (dirección exacta, depto) en la tabla de unidades.
- Muestra reserva activa por unidad con email del inversionista y montos.
- Permite cambiar `status` (DRAFT/OPEN/CLOSED) y `acceptingReservations` (pausa rápida) sin tocar BD.
- Permite editar la `description` pública (es la que se muestra arriba del pool en `/oportunidades/pools/[slug]`).
- Por unidad con reserva activa: **Cancelar** (reusa `POST /api/staff/reservations/[id]/cancel`) y **Escriturar (SOLD)** (reusa `POST /api/staff/reservations/[id]/escriturar`).

### Endpoints staff

- `GET   /api/staff/pools` — listado para la tabla.
- `GET   /api/staff/pools/[slug]` — detalle + unidades con `internalData` y reserva activa.
- `PATCH /api/staff/pools/[slug]` — actualiza `description`, `status` y/o `acceptingReservations` (validación zod).

### Endpoints reusados con extensión

Los endpoints staff de reservas existentes se extendieron para soportar Producto 2 sin duplicar lógica:

- `POST /api/staff/reservations/[id]/cancel` — ahora llama también a `reconcilePoolUnitAfterReservationChange`. Si la reserva era pool, libera la unidad (vuelve a `AVAILABLE` salvo `SOLD`).
- `POST /api/staff/reservations/[id]/escriturar` — además de transicionar a `CONFIRMED` y disparar payouts, si la reserva tiene `poolUnitId` pasa el unit a `SOLD` (estado terminal).

## Qué NO hace este producto (aún)

- Mercado Pago sigue siendo stub (igual que Producto 1): la integración real va con el SDK de MP — el contrato de `paymentService` ya está listo para ambos productos.
- No expone `internalData` por API: el endpoint público selecciona explícitamente campos seguros vía `POOL_UNIT_PUBLIC_SELECT`.
- UF dinámica (cron al SII + recálculo de `priceClp` en runtime) pendiente — hoy el `priceUf` queda fijo al momento del import.

## Vistas staff existentes

- **`/staff/pools`** + **`/staff/pools/[slug]`**: listado y detalle con `internalData` visible (dirección, depto), controles de status/pausa, acciones por reserva (cancelar/escriturar).
- **`/staff/reservas`**: vista unificada con reservas de Producto 1 (Property) **y** Producto 2 (Pool) en la misma tabla. Cada fila lleva un tag "Pool" / "Propiedad" para diferenciar.
- **`/staff/inversionistas`**: columna "DICOM (AVLA)" — preaprobación crediticia manual con AVLA, independiente del flujo de Pool.
