# Inventario de propiedades: código de inventario e import CSV

## Fuente de verdad y upsert

- **`inventoryCode`**: clave de negocio **estable y única** (ej. `MR-INV-001`). Columna obligatoria del CSV para **crear o actualizar** la misma propiedad en re-imports.
- **`houmPropertyId`**: opcional; cuando exista sync con Houm, sirve para **empatar** filas además del código de inventario.
- **`id` (cuid de Prisma)**: no debe usarse como clave en planillas manuales.

- Si ya existe `Property` con ese `inventory_code`, el servicio `upsertPropertyByInventoryCode` en [`src/lib/services/property.service.ts`](../src/lib/services/property.service.ts) **actualiza** la fila oficial en el acto (mismo merge de `metadata` que antes).
- Si el código es **nuevo**, la fila va a **`PropertyCatalogDraft`** (`source: CSV`, `status: PENDING`) vía `upsertCsvPropertyCatalogDraft` hasta que staff la apruebe en **Staff → Propiedades** (misma cola que los borradores Houm). Al aprobar, se crea `Property` con `status` y `visibleToBrokers` tomados del CSV.

**API (staff `SUPER_ADMIN`):**

- `GET /api/staff/properties/import/template` — descarga `plantilla-propiedades-maxrent.csv` (UTF-8 BOM, cabecera + fila de ejemplo).
- `POST /api/staff/properties/import` — `multipart/form-data` con campo `file` (CSV). Respuesta JSON: `{ ok, processed, created, updated, errors: [{ line, message }] }`. El contador `created` incluye filas **nuevas aceptadas en la cola de borradores** (no crean `Property` hasta aprobación).

La lógica de parseo y merge de metadata está en [`src/lib/property-csv-import.ts`](../src/lib/property-csv-import.ts). En la UI: **Staff → Propiedades** bloque «Importar CSV» y la card **Borradores pendientes (Houm + CSV)**.

## Formato del archivo

- Delimitador: **coma**, **punto y coma** o **tab** (se infiere desde la primera línea).
- Codificación: UTF-8 (la plantilla incluye BOM para Excel).
- Máximo **1000** filas de datos (sin contar cabecera).
- Cabeceras: **snake_case** como en la plantilla. El parser normaliza espacios/guiones y acepta alias: `inventorycode`, `houmpropertyid`, `houm_id`, `visibletobrokers`, `metadatajson`, `monedaventa` → `moneda_venta`, `paymentsjson`.

## Modelo de datos

`PropertyCatalogDraft` ([`prisma/schema.prisma`](../prisma/schema.prisma)) acumula filas nuevas desde CSV (`source: CSV`, `inventoryCode` único) o desde sync Houm (`source: HOUM`, `houmPropertyId` único), con `pendingPropertyStatus` / `pendingVisibleToBrokers` solo usados al aprobar borradores CSV.

En `Property` ([`prisma/schema.prisma`](../prisma/schema.prisma)):

| Campo | Uso |
|-------|-----|
| `inventoryCode` | Único opcional; clave CSV / inventario. |
| `houmPropertyId` | Único opcional; sync Houm. |
| `title`, `status`, `visibleToBrokers` | Columnas propias del catálogo. |
| `metadata` (JSON) | Ficha plana (comuna, m², amenities, arriendo/venta, pagos, etc.). |

En **actualización**, el `metadata` existente se **fusiona** con lo que venga del CSV (las claves del archivo pisan las anteriores cuando tienen valor).

### Metadata interna (reserva inversionista, no CSV)

Las reservas de inventario las inician los **inversionistas** (`Reservation`); el sync escribe en `metadata` de `Property` (además de `status: RESERVED`) claves como `investorReservationId`, `investorReservedByUserId`, `investorReservedAt`.

Claves históricas **`brokerReservedByUserId` / `brokerReservedAt`** (reserva directa broker, ya no usadas en producto) se siguen **eliminando** al persistir cuando staff pasa la propiedad a **`AVAILABLE`** vía `PATCH /api/staff/properties/:id`, y la reconciliación tras cambios de `Reservation` limpia holds y deja `AVAILABLE` si no hay reserva activa.

En **Staff → [Reservas](/staff/reservas)** se listan solo reservas activas de **inversionistas**; cancelar una reserva reconcilia el inventario. Si en BD quedaron filas `RESERVED` solo con metadata broker legacy, liberarlas con el mismo `PATCH` a `AVAILABLE` desde **Staff → Propiedades** (o un script one-off contra `Property`).

## Columnas del CSV (orden de la plantilla)

Todas salvo las marcadas **obligatorias** son opcionales.

| Columna | Obligatoria | Descripción |
|---------|-------------|-------------|
| `inventory_code` | Sí | Código único de inventario (= `Property.inventoryCode`). |
| `title` | Sí | Título de la propiedad. |
| `status` | No | `AVAILABLE` \| `RESERVED` \| `SOLD` \| `ARCHIVED`. Por defecto `AVAILABLE`. |
| `visible_to_brokers` | No | `true` / `false` / `1` / `0` / `yes` / `no` / `si`… Por defecto `false`. |
| `houm_property_id` | No | ID Houm si aplica. |
| `comuna` | No | Texto. |
| `dir` | No | Dirección. |
| `tipo` | No | Tipo de inmueble (texto). |
| `m2` | No | Superficie (número; coma decimal aceptada). |
| `dorm` | No | Dormitorios (entero). |
| `ban` | No | Baños (entero). |
| `estac` | No | Estacionamientos (entero). |
| `bodega` | No | Booleano (`true`/`false`, etc.). |
| `gc` | No | Gastos comunes (número). |
| `balcon` | No | Booleano. |
| `piscina` | No | Booleano. |
| `gym` | No | Booleano. |
| `mascotas` | No | Booleano. |
| `furnished` | No | Amoblado: `fully` / `full` / `amoblado` / `yes` / `1` / `true` → `fully` en metadata; cualquier otro valor no vacío → `non`. |
| `ac` | No | Aire acondicionado (booleano). |
| `fotos` | No | Cantidad de fotos (entero). |
| `arriendo` | No | Valor arriendo (número). |
| `moneda` | No | Moneda arriendo (texto, se guarda en minúsculas). |
| `inicio` | No | Inicio contrato / disponibilidad (texto, ej. fecha ISO). |
| `meses` | No | Plazo en meses (entero). |
| `venta` | No | Valor venta (número). |
| `moneda_venta` | No | Moneda venta (texto). Se persiste en metadata como `monedaVenta`. |
| `lat` / `lng` | No | Coordenadas (número). |
| `payments_json` | No | JSON array, **máximo 12** objetos: `{ "month": string, "dias": number entero ≥ 0, "status"?: "PAID" }`. Si es válido, se guarda en `metadata.payments`. Celda típicamente entre comillas dobles en CSV; comillas internas duplicadas (`""`). |
| `metadata_json` | No | Objeto JSON opcional; se **parsea** y se **mezcla** sobre el metadata ya armado desde columnas planas (solo objetos, no arrays). Claves conflictivas pisan valores de columnas previas. |

## `payments_json` (resumen)

Ejemplo válido:

```json
[
  { "month": "2025-01", "dias": 0, "status": "PAID" },
  { "month": "2025-02", "dias": 2 }
]
```

- `month`: string no vacío (ej. `YYYY-MM`).
- `dias`: entero ≥ 0.
- `status`: solo se admite el literal opcional `"PAID"`.

## Alta vía API (sin formulario en pantalla)

El `POST /api/staff/properties` sigue aceptando opcionalmente **`inventoryCode`** en el JSON (útil para scripts). En la UI de **Staff → Propiedades** el alta es por **import CSV** o sync Houm.

## Migración

Aplicar migración `20260417120000_add_property_inventory_code` (`npm run db:migrate` o `migrate deploy` en CI).

## Seed demo

`prisma/seed-properties.ts` asigna `MR-SEED-01` … `MR-SEED-10` a las filas demo para pruebas locales.

## Sync Houm y merge de `metadata.houm`

Si usás **Sincronizar desde Houm** (M2M), el payload completo queda en `metadata.houm`. La grilla Staff/Broker aplanan esos campos para columnas comunes; precedencia y aliases: [HOUM_CATALOG_METADATA.md](./HOUM_CATALOG_METADATA.md).
