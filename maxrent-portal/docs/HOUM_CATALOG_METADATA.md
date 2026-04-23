# Houm sync vs catálogo (metadata y UI)

## Qué persiste el sync M2M desde Houm

En [`src/lib/houm/sync-from-houm.ts`](../src/lib/houm/sync-from-houm.ts), cada fila de la API se procesa con [`syncHoumIngestOneRow`](../src/lib/services/property.service.ts):

| Situación | Dónde queda |
|-----------|-------------|
| Ya existe `Property` con el mismo `houmPropertyId` | Se **actualiza** título + `metadata` (merge con JSON previo; se preservan reservas broker). |
| **No** existe `Property` con ese id Houm | Se hace **upsert** en `PropertyCatalogDraft` (`source: HOUM`, `status: PENDING`) hasta que staff apruebe. |

Payload por fila (igual en borrador y en catálogo tras aprobar): `title` derivado del API (`deriveTitle`) y `metadata` `{ "houm": <objeto API>, …claves planas }` vía [`catalogFlatPatchFromHoumRaw`](../src/lib/houm/houm-sync-metadata-flat.ts).

### Aprobar / rechazar (staff)

- `GET /api/staff/properties/catalog-drafts?status=PENDING` — lista borradores Houm y CSV pendientes.
- `POST /api/staff/properties/catalog-drafts/[id]/approve` — crea `Property` (Houm: AVAILABLE + `visibleToBrokers` según `HOUM_SYNC_DEFAULT_VISIBLE_TO_BROKERS`; CSV: usa `status` / `visible_to_brokers` del archivo) y marca el borrador `APPROVED`.
- `POST /api/staff/properties/catalog-drafts/[id]/reject` — cuerpo opcional `{ "reason": "…" }`, marca `REJECTED`. Un sync o import posterior puede volver a poner la fila en `PENDING` con datos frescos.

El listado staff/broker sigue leyendo `metadata` vía `mergedMetadataRoot` (incluye `houm`).

## Cómo lo lee la grilla Staff / Broker

[`staffPropertyListDisplay`](../src/lib/broker/property-metadata-display.ts) usa un registro **aplanado** producido por `mergedMetadataRoot(metadata)`:

**Orden de fusión (menor a mayor prioridad):**

1. Uno de `metadata.catalog`, `metadata.raw` o `metadata.payload` (el primero que exista como objeto).
2. **`metadata.houm`** — campos del API expuestos al mismo nivel que el CSV plano.
3. **Claves en la raíz de `metadata`** — import CSV, `metadata_json`, o ediciones staff **pisan** valores anteriores para la misma clave.

Así, una fila que solo tenga `{ "houm": { "comuna": "…", "m2": 50, … } }` vuelve a llenar comuna / m² / arriendo en listado, siempre que los nombres de campo coincidan con los que el código reconoce (ver tabla abajo).

## Tabla: claves que usa el listado (extensible)

Estas son las rutas que `staffPropertyListDisplay` consulta (primer valor no vacío gana dentro de cada grupo). Actualiza esta tabla cuando el contrato oficial de la API Houm esté documentado; luego se pueden añadir más argumentos a `pickString` / `pickNumber` en código.

| Concepto | Claves probadas (orden) |
|----------|-------------------------|
| Comuna / título cabecera | `comuna`, `commune`, `commune_name`, `city`, `region`, `district` |
| Tipo | `tipo`, `type`, `property_type`, `propertyType` |
| m² | `m2`, `surface`, `area`, `square_meters`, `sqm`, `usable_area`, `built_area` |
| Dormitorios | `dorm`, `bedrooms`, `dormitorios`, `rooms`, `bedroom_count` |
| Baños | `ban`, `bathrooms`, `banos`, `bathroom_count` |
| Estacionamientos | `estac`, `parking`, `estacionamientos`, `parking_lots` |
| Dirección (subtítulo) | `dir`, `address`, `full_address`, `fullAddress`, `street`, `address_line1`, `addressLine1` |
| Moneda arriendo | `moneda`, `rent_currency`, `rentCurrency` |
| Arriendo (número) | `arriendo`, `rent`, `monthly_rent`, `rent_clp`, `monthlyRent`, `monthly_rent_clp` |
| Moneda venta | `monedaVenta`, `sale_currency`, `currency_sale`, `saleCurrency` |
| Venta (número) | `venta`, `sale_price`, `price`, `sale_uf`, `uf_price`, `list_price`, `salePrice` |
| Lat / lng | `lat` / `latitude`, `lng` / `longitude` / `lon` |

Campos extra del CSV (amenities, `payments`, etc.) siguen en `metadata` y aparecen en el panel expandido Staff donde ya se lean; no todos están en la grilla compacta.

## Verificación local rápida

Tras sincronizar desde Houm, en **Staff → Propiedades** abrí el JSON de una fila:

1. Confirmá que existe `houm` y que dentro están los campos que esperás de la API.
2. Si el listado sigue en “—”, compará nombres de propiedad en el JSON con la tabla de arriba; puede hacer falta **añadir un alias** en `staffPropertyListDisplay` (mismo archivo).

Script automático (sin DB): `npm run test:metadata-merge` (usa `tsx`) — valida que metadata **solo** `{ houm: { … } }` produce headline / m² / arriendo esperables y que la raíz pisa a `houm`. En algunos entornos restringidos hace falta ejecutarlo fuera del sandbox si `tsx` falla al crear IPC.

## Contrato API Houm (pendiente de producto)

Cuando tengan el schema OpenAPI o ejemplo real de `GET` propiedades, pegar aquí un ejemplo JSON anónimo y marcar **qué clave Houm** corresponde a cada fila de la tabla anterior. Eso evita adivinar aliases en código.

## Sync selectivo (Staff)

En **Staff → Propiedades** el bloque «Sincronizar desde Houm» permite:

- **Listado:** `GET` al listado con parámetros opcionales (mismo path que siempre). Los pares se envían como query string; los nombres de clave deben coincidir con lo que la API Houm acepta (ej. filtros de estado, paginación).
- **Por IDs:** un `GET` por cada id usando la plantilla `HOUM_PROPERTY_BY_ID_PATH` (obligatoria en este modo). Debe incluir el placeholder `{id}` (se URL-encodea). Ejemplo: `/admin/v2/properties/{id}`.

### Variables de entorno adicionales

| Variable | Descripción |
|----------|-------------|
| `HOUM_SYNC_MAX_ROWS` | Tras recibir el listado, máximo de filas que se upsertan (default `500`, tope duro `5000`). Si Houm devuelve más, se trunca y la respuesta JSON incluye `truncated: true`, `warning`, `totalReceived`. |
| `HOUM_PROPERTY_BY_ID_PATH` | Path bajo `HOUM_API_BASE_URL` para una propiedad, con `{id}`. Sin esto, el modo por IDs responde **501** con mensaje claro. |

### `POST /api/staff/properties/sync-from-houm`

Cuerpo JSON (opcional; vacío = listado sin query, igual que antes):

**Solo listado con filtros (ejemplo):**

```json
{
  "mode": "list",
  "listQuery": {
    "limit": "100",
    "rent_status": "active"
  }
}
```

Los nombres bajo `listQuery` dependen del contrato Houm; el servidor solo valida caracteres seguros en claves/valores.

**Solo IDs (ejemplo):**

```json
{
  "mode": "byIds",
  "houmIds": ["113670", "123201"]
}
```

Máximo **200** ids por request (`SYNC_FROM_HOUM_MAX_IDS` en código).

**Respuesta JSON** (incluye `errors: string[]`):

- `mode`: `"list"` | `"byIds"`
- `fetched`: filas procesadas (tras truncar en listado)
- `catalogPropertiesUpdated`: filas del inventario oficial ya vinculadas a Houm que se actualizaron
- `draftsCreated` / `draftsUpdated`: filas en cola `PropertyCatalogDraft` con `source: HOUM` (nuevas vs refrescadas)
- `totalReceived`: solo si hubo truncado — total devuelto por Houm antes del corte
- `truncated`, `warning`: cuando aplica el límite `HOUM_SYNC_MAX_ROWS`
