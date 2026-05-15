# Contribuir al portal MaxRent

Reglas para mantener el código y la documentación coherentes.

> **Si trabajas con Claude Code u otra herramienta IA**, leé también [`maxrent-portal/CLAUDE.md`](../CLAUDE.md) — incluye Definition of Done + anti-patterns observados en el proyecto. Ese archivo se carga automáticamente al inicio de cada sesión IA.

## Regla #1 — Documentar siempre, en el mismo PR

**Cero PRs sin actualizar la documentación correspondiente.** Si un cambio no incluye su update de docs, está incompleto.

La deuda de documentación crece exponencialmente y se vuelve imposible de pagar después. Mejor 10 minutos extra ahora que un día rehaciendo doc obsoleta dentro de tres meses.

### Enforcement estructural

Desde 2026-05-14, esta regla **NO** es solo un acuerdo blando — hay 3 defensas en el repo que la fuerzan:

1. **GitHub Action** ([`.github/workflows/docs-check.yml`](../../.github/workflows/docs-check.yml)) — falla CI si un PR toca `maxrent-portal/src/**`, `prisma/**`, `scripts/**`, `vercel.json` o `package.json` pero NO actualiza ningún `.md` ni `.env.example` en `maxrent-portal/`. Tests files (`*.test.ts`) excluidos.

   - **Escape hatch**: `[skip docs]` en el título o body del PR si el cambio genuinamente no requiere docs (fix de typo en comentario, bump de dep menor, refactor puro). Usar con criterio — el reviewer puede validar que aplica.

2. **PR template** ([`.github/PULL_REQUEST_TEMPLATE.md`](../../.github/PULL_REQUEST_TEMPLATE.md)) — GitHub auto-rellena el body de cada PR nuevo con un checklist obligatorio que incluye sección "Documentación".

   - Cuando creás PRs desde `gh pr create --body "..."` el template no se aplica automáticamente, pero **incluí el checklist manualmente** en el body para mantener la convención.

3. **Definition of Done** ([`CLAUDE.md`](../CLAUDE.md)) — Definition of Done + reglas + anti-patterns. Lo carga Claude Code al inicio de cada sesión.

## Qué documentar y dónde

| Tipo de cambio | Documento(s) a actualizar |
|---|---|
| **Modelo Prisma nuevo o cambio de campos** | `prisma/schema.prisma` (con comentarios `///`) + [`docs/DATABASE.md`](./DATABASE.md) (diagrama Mermaid + notas + tabla de enums) + sección 3 de [`CONTEXTO-PROYECTO.md`](../CONTEXTO-PROYECTO.md) |
| **Nuevo endpoint o API route** | Sección 5 (API Endpoints) de `CONTEXTO-PROYECTO.md`. Marcar si es público, qué auth requiere, qué hace. |
| **Nuevo flujo end-to-end** (lead → portal, login → onboarding, evaluación → reserva, etc.) | Sección 6 (Flujos técnicos) de `CONTEXTO-PROYECTO.md` con paso a paso. |
| **Nueva integración externa** (Floid, Resend, Mercado Pago, Houm, Auth0, etc.) | Sección 8 (Integraciones) de `CONTEXTO-PROYECTO.md` con estado, env vars, endpoints. README dedicado en `docs/` si la integración es compleja. |
| **Nueva env var** | [`.env.example`](../.env.example) (con comentario explicando qué hace) + sección correspondiente de [`SETUP.md`](../SETUP.md). |
| **Nueva capa de servicio o patrón arquitectónico** | README dedicado en la carpeta del servicio (`src/lib/services/<nombre>/README.md`). Si la decisión es de largo plazo (afecta más allá del PR), documentar también en la memoria del proyecto. |
| **Nuevo template de email** | Sumarlo al `_registry.ts` con su `TemplateMap` typed + entrada en [`src/lib/services/notifications/README.md`](../src/lib/services/notifications/README.md). |
| **Nuevo proveedor de comunicaciones** (cambiar Resend o sumar SMS/WhatsApp) | Adapter en `providers/<canal>-<slug>.ts` + registry + sección "Cambiar de proveedor" del README. |
| **Cambio en flujo de auth o middleware** | Sección 6.1 / 7 de `CONTEXTO-PROYECTO.md` + `.cursorrules` si cambia convención. |
| **Nuevas páginas o áreas del portal** | Estructura de carpetas en `SETUP.md` y `.cursorrules`. |

## Convenciones de comentarios en código

- **Prisma `schema.prisma`**: cada modelo y campo no obvio debe tener un comentario `///` explicando qué hace. Esos comentarios viajan al cliente Prisma y aparecen en autocompletado de cualquier dev.
- **Servicios** (`lib/services/`): las funciones públicas exportadas deben tener JSDoc explicando inputs, outputs y side-effects (especialmente si tocan DB, llaman APIs externas o disparan procesos asíncronos).
- **Route handlers**: header con descripción de qué hace, qué auth requiere, qué CORS aplica si es público.

## Mini-checklist antes de mergear

- [ ] ¿Toqué `schema.prisma`? → `DATABASE.md` y sección 3 de `CONTEXTO-PROYECTO.md` actualizados.
- [ ] ¿Agregué endpoint? → Sección 5 de `CONTEXTO-PROYECTO.md` lo lista.
- [ ] ¿Agregué env var? → `.env.example` y `SETUP.md` la tienen.
- [ ] ¿Cambié flujo end-to-end? → Sección 6 lo refleja.
- [ ] ¿Es decisión arquitectónica de largo plazo? → Documentada en `memory/` (gestión de Claude Code) o en archivo de `docs/` propio.
- [ ] ¿Cambié estructura del proyecto o convención de código? → `.cursorrules` actualizado.

Si alguno queda en "no" sin justificación clara, el PR **no se mergea** hasta resolver.

## Si descubrís deuda de documentación de algo previo

No la dejes pasar. Hacé un PR `docs:` específico que la pague antes de avanzar con features nuevas. Es lo que hicimos en los PRs #16 y #17 cuando llegamos al límite.

## Convenciones generales

- Commits en español, descriptivos. Tipo en inglés (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`).
- Una migración Prisma por cambio de schema, generada via `npm run db:migrate` (que usa `prisma migrate dev`). Las migraciones se aplican automáticamente en el build de Vercel — no hay paso manual a producción.
- Validación con Zod en cada API route, usar `.safeParse()`.
- Server Components por defecto; `"use client"` solo cuando sea necesario.
- TypeScript estricto: nunca `any`, preferir `unknown` + type narrowing.
- **Todo route handler nuevo en `src/app/api/**/route.ts` lleva `applyRateLimit`** con uno de los 4 buckets de [`docs/RATE_LIMIT.md`](./RATE_LIMIT.md). Sin excepciones salvo `/api/auth/*` (NextAuth interno). Esto es regla obligatoria desde 2026-05-15 — `CLAUDE.md` lo lista en la Definition of Done para que Claude Code lo detecte.

## Más referencias

Mapa rápido de docs del proyecto. Ver [`docs/README.md`](./README.md) para índice completo.

- [`maxrent-portal/CONTEXTO-PROYECTO.md`](../CONTEXTO-PROYECTO.md) — visión del producto + arquitectura + modelo de datos + endpoints + flujos + integraciones (la referencia rápida).
- [`maxrent-portal/CLAUDE.md`](../CLAUDE.md) — Definition of Done + reglas operacionales + anti-patterns para herramientas IA.
- [`maxrent-portal/SETUP.md`](../SETUP.md) — instalar el portal en local + configurar providers externos.
- [`docs/DATABASE.md`](./DATABASE.md) — schema completo + diagrama Mermaid + atribución de referidos.
- [`docs/POOL_PRODUCTO.md`](./POOL_PRODUCTO.md) — Producto 2 (Pool de propiedades arrendadas).
- [`docs/RATE_LIMIT.md`](./RATE_LIMIT.md) — 4 buckets con Vercel KV (Upstash).
- [`docs/BACKUP_RESTORE.md`](./BACKUP_RESTORE.md) — backup diario a Vercel Blob + procedimiento de restore.
- [`docs/MIGRATION_TO_HOUM.md`](./MIGRATION_TO_HOUM.md) — runbook de migración del repo a la org de Houm (bus factor).
- [`docs/FLOID_SETUP.md`](./FLOID_SETUP.md) + [`docs/FLOID_API_REFERENCE.md`](./FLOID_API_REFERENCE.md) — integración Floid.
- [`docs/AVLA.md`](./AVLA.md) — preaprobación DICOM manual desde staff via API "seguro de crédito" de AVLA.
- [`docs/PROPERTY_INVENTORY_IMPORT.md`](./PROPERTY_INVENTORY_IMPORT.md) — import CSV de propiedades.
- [`docs/HOUM_CATALOG_METADATA.md`](./HOUM_CATALOG_METADATA.md) — sync con Houm.
