# Documentación del portal MaxRent

Índice de todos los docs del proyecto. Si no encontrás lo que buscas acá, probá [`CONTEXTO-PROYECTO.md`](../CONTEXTO-PROYECTO.md) que es la referencia rápida de arquitectura/endpoints/flujos/integraciones.

## Para empezar

| Doc | Cuándo leerlo |
|---|---|
| [`../CONTEXTO-PROYECTO.md`](../CONTEXTO-PROYECTO.md) | Primer doc para entender qué hace el proyecto. Cubre visión, stack, modelo de datos, endpoints, flujos, integraciones. |
| [`../SETUP.md`](../SETUP.md) | Instalar el portal en local + configurar providers externos (Google OAuth, Resend, Floid, Vercel KV, Vercel Blob). |
| [`../CLAUDE.md`](../CLAUDE.md) | Definition of Done + reglas + anti-patterns. Lo carga automáticamente Claude Code. Léelo si vas a contribuir. |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Convenciones de código, commits, branches, enforcement de docs. |

## Por dominio

### Datos
| Doc | Tema |
|---|---|
| [`DATABASE.md`](./DATABASE.md) | Schema completo + diagrama Mermaid + atribución de referidos + sección Producto 2 (Pool). |
| [`BACKUP_RESTORE.md`](./BACKUP_RESTORE.md) | Backup diario a Vercel Blob (cron 06:30 UTC) + procedimiento de restore via Neon branch + lecciones aprendidas del rollout. |

### Productos
| Doc | Tema |
|---|---|
| [`POOL_PRODUCTO.md`](./POOL_PRODUCTO.md) | Producto 2: pool de propiedades arrendadas. Schema, import del Excel, UI inversionista, flujo de reserva, panel staff. |
| [`PROPERTY_INVENTORY_IMPORT.md`](./PROPERTY_INVENTORY_IMPORT.md) | Producto 1: import CSV de propiedades + flujo de borradores Houm/CSV. |
| [`HOUM_CATALOG_METADATA.md`](./HOUM_CATALOG_METADATA.md) | Sincronización con el catálogo de Houm (M2M). |

### Integraciones externas
| Doc | Tema |
|---|---|
| [`FLOID_SETUP.md`](./FLOID_SETUP.md) | Configuración de Floid Widget + variables de entorno. |
| [`FLOID_API_REFERENCE.md`](./FLOID_API_REFERENCE.md) | Referencia de los endpoints contratados con Floid (SP + SII + CMF). |
| [`AVLA.md`](./AVLA.md) | Preaprobación DICOM manual desde staff vía API "seguro de crédito" de AVLA (piggyback sobre póliza de Houm). |

### Seguridad / operación
| Doc | Tema |
|---|---|
| [`RATE_LIMIT.md`](./RATE_LIMIT.md) | 4 buckets con Vercel KV (Upstash Redis). Cómo aplicar a un endpoint nuevo. |
| [`BACKUP_RESTORE.md`](./BACKUP_RESTORE.md) | (ver arriba) — Modelo de respaldo en 3 capas. |
| [`MIGRATION_TO_HOUM.md`](./MIGRATION_TO_HOUM.md) | Runbook de migración del repo + infra a la organización de Houm. Reduce el bus factor de 1 a N. |

## Enforcement de docs

Tres defensas estructurales para que esta documentación se mantenga actualizada:

- **GitHub Action** [`.github/workflows/docs-check.yml`](../../.github/workflows/docs-check.yml) — falla CI si código cambia y docs no.
- **PR template** [`.github/PULL_REQUEST_TEMPLATE.md`](../../.github/PULL_REQUEST_TEMPLATE.md) — checklist obligatorio.
- **CLAUDE.md** [`../CLAUDE.md`](../CLAUDE.md) — Definition of Done para sesiones IA.

Detalle de la regla y cómo se aplica: [`CONTRIBUTING.md`](./CONTRIBUTING.md) sección "Enforcement estructural".

## Si falta un doc o algo está desactualizado

Hacé un PR `docs:` específico y mergealo antes de avanzar con features nuevas. La deuda de documentación se paga mejor cuando es chica.
