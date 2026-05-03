# Contribuir al portal MaxRent

Reglas para mantener el código y la documentación coherentes.

## Regla #1 — Documentar siempre, en el mismo PR

**Cero PRs sin actualizar la documentación correspondiente.** Si un cambio no incluye su update de docs, está incompleto.

La deuda de documentación crece exponencialmente y se vuelve imposible de pagar después. Mejor 10 minutos extra ahora que un día rehaciendo doc obsoleta dentro de tres meses.

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
