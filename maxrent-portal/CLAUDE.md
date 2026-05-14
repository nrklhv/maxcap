# Claude — instrucciones del proyecto maxrent-portal

> Este archivo lo cargan herramientas como Claude Code al trabajar en este repo. Mantiene reglas de proyecto + Definition of Done para que cualquier sesión arranque sabiendo qué exige este codebase.

## Definition of Done (DoD)

**Antes de pedir merge a `main`**, verificar TODAS las casillas:

### Código
- [ ] `npx tsc --noEmit` → 0 errores en archivos modificados
- [ ] `npx vitest run` → todos los tests verde
- [ ] `npx next build` → "Compiled successfully"
- [ ] `npx eslint <archivos-tocados>` → sin warnings nuevos
- [ ] Si toca DB → migración Prisma formal en `prisma/migrations/` (no `db push` en prod)
- [ ] Si toca pago / cron / webhook → probado con `curl` manual contra el endpoint

### Documentación (obligatorio — bloquea CI)
- [ ] `docs/<TEMA>.md` específico del feature actualizado (o creado si es nuevo)
- [ ] `CONTEXTO-PROYECTO.md` §§ 5/6/8 actualizado si toca endpoints/flujos/integraciones
- [ ] `.env.example` actualizado si agregué env vars
- [ ] `SETUP.md` actualizado si cambia el setup local
- [ ] Memoria personal del usuario (`~/.claude/projects/.../memory/`) actualizada si es cambio mayor
- [ ] Si se justifica saltar docs → `[skip docs]` en título o body del PR

### PR
- [ ] Título descriptivo formato `tipo(scope): mensaje` (max 70 chars)
  - Tipos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`
  - Ejemplos: `feat(pool): API staff de portafolios`, `fix(middleware): exentar /api/cron/*`
- [ ] Body sigue el `PULL_REQUEST_TEMPLATE.md` (Resumen + Cambios + Test plan + Docs + Riesgo + Rollback)
- [ ] Checklist del template tildado **honestamente** — no por la forma

## Reglas del proyecto

### Estilo
- **Español neutro/chileno**. NO voseo argentino (no "podés", no "tenés", no "querés"). Usar "puedes", "tienes", "quieres".
- Sin emojis salvo que el usuario los pida.
- Comentarios en español si la audiencia del archivo es el equipo MaxRent.

### Seguridad
- **Cero secrets en código**. Todo via env vars (`process.env.XXX`).
- Nunca pegar secrets reales en chat ni en docs — usar placeholders (`<TU_VALOR>`).
- Cuando un secret se expone accidentalmente → rotarlo en el provider.
- Datos sensibles (`PoolUnit.internalData` con dirección/depto, RUTs, etc.) **NUNCA** se exponen al cliente. Solo a staff por endpoints dedicados.

### Datos
- Migraciones Prisma formales en `prisma/migrations/`, no `db push` contra prod.
- Las migraciones son **aditivas** por default. Cualquier columna removida o renombrada exige doble deploy (deprecate + remove) con feature flag.
- Service layer (`src/lib/services/*`) aislado de Prisma directo en route handlers complejos.

### Arquitectura
- **Inversionista** (portal) y **broker** (canal comercial) y **staff** (admin) viven en el mismo monolito con segregación por rol via middleware.
- Producto 1 (Property) y Producto 2 (Pool) tienen tablas independientes pero comparten flujo de reserva con XOR `Reservation.propertyId | poolUnitId`.
- Capa de notifications es vendor-agnostic (cambiar provider = 1 env var). Detalle: `src/lib/services/notifications/README.md`.

### Tests
- Tests unitarios con vitest en `*.test.ts` al lado del archivo testeado.
- Service layer testeable sin Prisma: extraer lógica pura a archivos `*-core.ts` o similares cuando un test no puede levantar NextAuth/Prisma.

## Anti-patterns observados — no repetir

Lecciones aprendidas que dejan cicatriz:

1. **Saltearse documentación porque "el código se entiende solo"**.
   Pasó con Pool y con backup antes del enforcement. Por eso ahora hay GitHub Action que bloquea PRs sin docs.

2. **Mergear sin actualizar `CONTEXTO-PROYECTO.md`**.
   El archivo es la referencia rápida del proyecto. Sin docs actualizadas, nadie sabe qué hace el sistema sin leer todo el código.

3. **Pegar secrets reales en chat** (`DATABASE_URL`, `CRON_SECRET`, etc.).
   Aunque el chat sea privado, queda en logs y en el contexto de IA. Rotar después de cualquier exposición.

4. **Probar fixes solo en local sin validar deploy real**.
   Vercel preview / production tiene env vars, runtime, lambdas distintas a local. El flujo "merge → deploy → run cron" debe ejecutarse antes de cerrar el ciclo.

5. **Webhook / cron sin exención en el middleware de NextAuth**.
   El middleware corta requests sin sesión con 401. Endpoints `/api/cron/*`, `/api/payments/webhook`, `/api/floid/callback`, `/api/notifications/webhook/*` deben estar en la lista de excepciones (validan auth internamente con Bearer o firma).

6. **Endpoints públicos sin rate limit**.
   `/api/public/leads` se llena de spam si no tiene bucket. Ver `docs/RATE_LIMIT.md` para los 4 buckets y cómo aplicar a un endpoint nuevo.

## Referencias rápidas

- Arquitectura general: `CONTEXTO-PROYECTO.md`
- Setup local: `SETUP.md`
- DB schema + relaciones: `docs/DATABASE.md`
- Rate limiting: `docs/RATE_LIMIT.md`
- Backup + restore: `docs/BACKUP_RESTORE.md`
- Pool (Producto 2): `docs/POOL_PRODUCTO.md`
- Floid (eval crediticia): `docs/FLOID_SETUP.md` + `docs/FLOID_API_REFERENCE.md`
- Inventario de propiedades (CSV import): `docs/PROPERTY_INVENTORY_IMPORT.md`
- Migración del repo a Houm (bus factor): `docs/MIGRATION_TO_HOUM.md`
- Contribuir: `docs/CONTRIBUTING.md`

## Servicios externos activos

| Servicio | Para qué | Doc |
|---|---|---|
| Neon | Postgres serverless | `docs/DATABASE.md` |
| Vercel | Hosting + Cron | `vercel.json` + Settings tab |
| Vercel KV (Upstash Redis) | Rate limiting | `docs/RATE_LIMIT.md` |
| Vercel Blob | Backups offsite | `docs/BACKUP_RESTORE.md` |
| Resend | Emails transaccionales | `src/lib/services/notifications/README.md` |
| Google OAuth | Login | `SETUP.md` § Google OAuth |
| Floid Widget | Evaluación crediticia | `docs/FLOID_SETUP.md` |
| Mercado Pago | Pagos (stub, pendiente integración real) | `src/lib/services/payment.service.ts` |
