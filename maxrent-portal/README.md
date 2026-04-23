# maxrent-portal

Aplicación Next.js: portal (usuarios / brokers) y panel **staff** para el inventario de propiedades MaxRent.

## Documentación

- [Import CSV de inventario](docs/PROPERTY_INVENTORY_IMPORT.md): columnas, `payments_json`, `metadata_json`, endpoints staff y reglas de merge de `metadata`.

## Scripts

| Comando | Uso |
|--------|-----|
| `npm run dev` | Desarrollo (puerto **3002**) |
| `npm run build` | Build de producción |
| `npm start` | Servidor tras build |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Migraciones Prisma |
| `npm run db:seed` | Seed demo |
| `npm run db:studio` | Prisma Studio |

## Flujos principales

- **Staff** (rutas bajo `/staff`, rol `SUPER_ADMIN`): pestaña **Inventario** (import CSV, sync Houm, tabla con Portal/Borrador) y **Reservas** (`GET /api/staff/properties/reservations`): reservas activas de **inversionistas** (`Reservation`); staff puede cancelar y reconciliar inventario.
- **Broker** (cuenta con `brokerAccessStatus` aprobado): `GET /api/broker/properties` devuelve solo oportunidades **`available`** (catálogo lectura). Las reservas son siempre vía inversionista (`Reservation` + sync en `Property`); el broker ve inversionistas patrocinados y sus reservas en `/broker/inversionistas`.

## Entorno

Definí credenciales y URL de base de datos en `.env` / `.env.local` (ver proyecto y `machine-to-machine-tokens.md` si aplica). No subas secretos al repositorio.
