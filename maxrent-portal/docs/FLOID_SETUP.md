# Floid — setup y pruebas (sandbox / productivo)

Guía operativa para conectar el portal MaxRent con la API Floid tras obtener acceso al [dashboard Floid](https://dashboard.floid.io). El código que llama a la API está en [`src/lib/services/floid.service.ts`](../src/lib/services/floid.service.ts); el webhook async en [`src/app/api/floid/callback/route.ts`](../src/app/api/floid/callback/route.ts).

**Referencia amplia de la API** (REST, sync/async, índice de rutas por país): [FLOID_API_REFERENCE.md](./FLOID_API_REFERENCE.md).

## 0. Cómo encaja el portal con la API Floid

El servidor arma un `POST` a `FLOID_API_URL` + `FLOID_SERVICE_PATH` con este body (simplificado):

| Campo | Origen | Notas |
|--------|--------|--------|
| Identificador del titular | `FLOID_ID_BODY_FIELD` (default `id`) | Valor = RUT del perfil, normalizado (sin puntos, en mayúsculas). |
| `caseid` | Siempre | UUID de la fila `CreditEvaluation` en la base del portal (sirve para correlación con Floid y soporte). |
| `callbackUrl` | Solo si definís `FLOID_CALLBACK_URL` | URL pública HTTPS de tu app + `/api/floid/callback`. Activa flujo **asíncrono** si el producto lo usa así. |

**Importante:** muchos ejemplos de la doc Floid incluyen `password` (Clave Única, bancos, SII). El portal **no envía contraseñas** del inversionista: solo el RUT en el campo configurado. El **`FLOID_SERVICE_PATH`** debe corresponder a un producto que acepte esa forma de consulta (o tendrás que ampliar el código y el flujo de consentimiento).

**Webhook:** Floid debe poder hacer `POST` a tu callback con header `Authorization: Bearer <mismo valor que FLOID_WEBHOOK_SECRET>` (ver ruta callback arriba).

**Parser:** respuestas 200 con score / montos se mapean en [`src/lib/floid/parse-floid-response.ts`](../src/lib/floid/parse-floid-response.ts). Si el JSON del producto no trae campos reconocibles, la evaluación puede quedar en error de parser aunque Floid haya respondido OK.

## 1. Qué obtener en el dashboard Floid (checklist)

Marcá cada ítem cuando lo tengas del panel o del contacto comercial:

| Dato | Variable / uso |
|------|------------------|
| Token API **sandbox** (Bearer) | `FLOID_API_KEY` en dev / preview |
| URL base API **sandbox** (si difiere de producción) | `FLOID_API_URL` |
| Ruta HTTP del producto contratado (path tras el host) | `FLOID_SERVICE_PATH` (ej. `/v1/...`) |
| Nombre del campo del body donde va el RUT | `FLOID_ID_BODY_FIELD` (por defecto `id` en el código) |
| ¿Respuesta **síncrona** (JSON con score) o **asíncrona** (ack + callback)? | Si async: `FLOID_CALLBACK_URL` + `FLOID_WEBHOOK_SECRET` |
| Token API **productivo** y URL base prod | Solo entorno producción (Vercel Production) |
| Límite de uso (ej. 50 consultas productivas) | Coordinar pruebas; no gastar cuota en desarrollo |

Confirmar con Floid: allowlist de IP, dominios permitidos para `callbackUrl`, y ejemplo de JSON de éxito/error para alinear el parser en [`src/lib/floid/parse-floid-response.ts`](../src/lib/floid/parse-floid-response.ts).

## 2. Seguridad

- El **login del dashboard** Floid no se copia a `.env` del portal: solo sirve para administrar claves en floid.io.
- Los **tokens API** van en `.env.local` (local), variables de Vercel (preview/producción), o secret manager. Nunca en git.
- Si un secreto pudo filtrarse, **rotarlo** en el dashboard y actualizar el deploy.

## 3. Configuración local / staging (sandbox)

En `maxrent-portal/.env.local` (no versionado):

```bash
FLOID_API_KEY=<token_sandbox>
FLOID_API_URL=https://api.floid.app
# Ajustar si Floid indica otra base para sandbox:
# FLOID_API_URL=https://...

FLOID_SERVICE_PATH=/ruta/que/indique/floid
FLOID_USE_STUB=false

# Opcional: solo si el producto es asíncrono y tenés URL HTTPS pública
# FLOID_CALLBACK_URL=https://tu-preview.vercel.app/api/floid/callback
# FLOID_WEBHOOK_SECRET=<mismo Bearer que configurás en Floid para el webhook>
```

- **Host (`FLOID_API_URL`):** el portal usa por defecto **`https://api.floid.app`**, que coincide con el certificado TLS que vimos en entornos de prueba. Si la doc de Floid cita `https://api.floid.cl` como `HOST`, confirmá con ellos cuál deben usar: con `.cl` algunos clientes fallan con error de certificado (SAN del certificado apuntando a `*.floid.app`).
- **`FLOID_USE_STUB=false`** fuerza llamada real si hay `FLOID_API_KEY`. Sin clave, el código sigue en stub salvo que definas explícitamente el comportamiento (ver `.env.example`).
- Para **callback en local**, hace falta un túnel (ngrok, Cloudflare Tunnel, etc.) que apunte a `http://localhost:3002` y usar esa URL en `FLOID_CALLBACK_URL`.

Referencia de variables: [`.env.example`](../.env.example).

## 4. Pasos siguientes para probar la API con Floid

Seguí el orden; así separás problemas de red/token de problemas del portal.

### 4.1 Requisitos previos

1. **Token Bearer** de sandbox (y, si aplica, **host** distinto de `https://api.floid.app`) desde Floid / dashboard.
2. **Ruta exacta** del producto habilitado para ese token: `FLOID_SERVICE_PATH` (ej. `/cl/.../...`).
3. Confirmar con Floid si el producto acepta body **solo con `id` (RUT)** y `caseid`, o si exige más campos.
4. Base de datos local migrada y `npm run dev` levantando el portal en el puerto **3002** (ver `package.json`).

### 4.2 Configurar `.env.local`

Valores mínimos para dejar de usar el stub y llamar a Floid:

```bash
FLOID_API_KEY=<token_sandbox>
FLOID_API_URL=https://api.floid.app
FLOID_SERVICE_PATH=/ruta/exacta/que/indique/floid
FLOID_USE_STUB=false
```

Opcional (solo flujo **asíncrono**):

```bash
FLOID_CALLBACK_URL=https://<tu-url-publica>/api/floid/callback
FLOID_WEBHOOK_SECRET=<mismo_secreto_que_configuras_en_Floid_para_el_webhook>
```

En local, `<tu-url-publica>` suele ser un túnel (ngrok, Cloudflare Tunnel, etc.) hacia `http://localhost:3002`.

### 4.3 Probar Floid **sin** el portal (curl)

Así validás token, host y path. Reemplazá `TU_RUT` y la URL completa (misma base + path que usará el portal):

```bash
curl -sS -X POST "${FLOID_API_URL}${FLOID_SERVICE_PATH}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${FLOID_API_KEY}" \
  -d "{\"id\":\"TU_RUT\",\"caseid\":\"00000000-0000-4000-8000-000000000001\"}"
```

- Si aquí ya falla (401, 403, 400 de credenciales del **token** o del producto), corregí env o contrato con Floid antes de probar UI.
- Si el producto exige más campos en el JSON, el mismo error te lo mostrará Floid en el cuerpo de respuesta.

**`curl: (28)` con “0 bytes received” y `HTTP:000`:** el cliente cortó por **`-m`** sin recibir **ningún** byte de cuerpo. Suele ser (a) **Floid o la CMF tardan o no responden** para ese `POST` (p. ej. `debt_v2` sin `password` o cola en sandbox), (b) **ruta IPv6** problemática — probá **`curl -4`** (solo IPv4), (c) **proxy/firewall** que deja la conexión colgada. Para ver en qué fase se queda: `curl -v --connect-timeout 20 -m 90 ...` (sin `-s` al principio, o `-v` además de `-s`).

En el portal podés definir **`FLOID_FETCH_TIMEOUT_MS`** (milisegundos) para que el `fetch` no quede colgado indefinidamente y falle con mensaje claro (ver [`.env.example`](../.env.example)).

### 4.4 Probar vía portal (`/evaluacion`)

1. Sesión de un usuario con **`canInvest`**, perfil con **RUT** y **datos laborales** válidos (regla “perfil completo” del portal).
2. Ir a **`/evaluacion`**, aceptar el consentimiento y la confirmación de datos, y solicitar la evaluación.
3. Revisar en BD la tabla **`CreditEvaluation`**: `status`, `rawResponse`, `floidCaseId`, `errorMessage`, `completedAt`.
4. Si usás **callback**: verificá que Floid pueda alcanzar tu URL y que el **Bearer** del webhook coincida con `FLOID_WEBHOOK_SECRET`; luego comprobá que el registro pase a **COMPLETED** o **FAILED** con `rawResponse` actualizado.

### 4.5 Si falla el parser

Mensaje del estilo de que Floid devolvió 200 pero no hay campos reconocibles: copiá un **fragmento anónimizado** de `rawResponse` y ajustá `parseFloidPayload` / `looksLikeFloidAsyncAck` en [`src/lib/floid/parse-floid-response.ts`](../src/lib/floid/parse-floid-response.ts) según el JSON real del producto.

Staff puede ver el historial en **`/staff/inversionistas`** (ficha del inversionista).

## 5. Producción (cuota productiva)

1. Solo cuando sandbox esté validado, cargar en **Vercel → Production** las variables **productivas** (`FLOID_API_KEY`, `FLOID_API_URL`, `FLOID_SERVICE_PATH`, etc.).
2. Mantener **`FLOID_USE_STUB=false`** en prod si usás API real.
3. **Limitar pruebas manuales** en producción si el contrato incluye un tope (ej. 50 consultas): usar sandbox/preview para regresiones.
4. `FLOID_CALLBACK_URL` en prod debe ser la URL pública definitiva del portal (`https://<dominio>/api/floid/callback`).

## 6. Documentación externa

- API general: [docs.floid.io](https://docs.floid.io/)
