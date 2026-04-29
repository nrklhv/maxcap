# Integración Floid (Widget) — Setup

MaxRent integra **Floid Widget** para obtener el reporte financiero del inversionista (renta SP + carpeta tributaria SII + deuda CMF) en una sola sesión hospedada por Floid. **El portal NO captura claves del usuario**: Clave Única, Clave Tributaria SII y 2FA se ingresan dentro del dominio `admin.floid.app`.

## Arquitectura

```
┌────────────────────┐
│ Portal /evaluacion │  ← inversionista marca consentimiento
└─────────┬──────────┘
          │ POST /api/floid/evaluate
          ▼
┌────────────────────┐
│ floid.service.ts   │  ← crea CreditEvaluation (PENDING) y devuelve
│ createWidget…      │    { evaluationId, widgetUrl }
└─────────┬──────────┘
          │ widgetUrl en popup
          ▼
┌────────────────────┐
│ Floid Widget       │  ← usuario completa Clave Única + 2FA + SII
│ admin.floid.app    │
└─────────┬──────────┘
          │ POST al webhook
          ▼
┌────────────────────┐
│ /api/floid/callback│  ← parser estructura SP/SII/CMF, persiste
│ completeFloid…     │    summary + downloadPdfUrl + rawResponse
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Portal /evaluacion │  ← polling detecta COMPLETED, muestra resumen
└────────────────────┘
```

## Variables de entorno

```bash
# .env.local
FLOID_WIDGET_URL=https://admin.floid.app/<merchant>/widget/<widget_id>
FLOID_WEBHOOK_SECRET=<un_secret_largo>      # OBLIGATORIO en producción
FLOID_USE_STUB=true                          # opcional: forzar stub aunque haya widget URL
```

| Variable | Uso | Obligatoria |
|---|---|---|
| `FLOID_WIDGET_URL` | URL del widget en admin.floid.app | Sí, salvo modo stub |
| `FLOID_WEBHOOK_SECRET` | Validar `Authorization: Bearer <secret>` del POST de Floid | **Sí en producción** |
| `FLOID_USE_STUB` | `true` = simular (no abrir widget); `false` = forzar widget | Opcional |

**Sin `FLOID_WIDGET_URL`** o con `FLOID_USE_STUB=true` el portal usa un stub determinístico (payload simulado con SP/SII/CMF) — útil para iterar UI sin tocar Floid.

## Configuración del widget en `admin.floid.app`

1. Crear widget desde la sección Widgets → "Crear Widget".
2. Habilitar los 3 productos contratados:
   - **AFC Reporte** (Sup. Pensiones — `get_renta_imponible`)
   - **Reporte Deuda CMF** (`debt`/`debt_v2`)
   - **SII Lectura** (`get_carpeta_tributaria` + `solicitud_creditos`)
3. **Webhook URL**: `https://<dominio>/api/floid/callback`
   - Para desarrollo local: usar `cloudflared tunnel --url http://localhost:3002` y poner la URL pública.
4. (Opcional) **Redirect URL**: `https://<dominio>/evaluacion` — adónde mandar al usuario al cerrar.

> ⚠️ **Pendiente confirmar con Floid**: si el `Authorization` header del webhook es configurable en el admin (recomendado, debería matchear `FLOID_WEBHOOK_SECRET`) o si Floid genera un token automático que tenemos que ver una vez.

## Shape del payload que devuelve el widget

Capturado en producción 2026-04-28. **UN solo POST agregado** con todo:

```json
{
  "code": 200,
  "message": "OK",
  "consumerId": "12345678-9",
  "caseid": "<uuid global del widget>",
  "custom": "<evaluationId que enviamos al abrir>",
  "download_pdf": "<URL absoluta al PDF generado>",
  "SP":  { "renta_imponible": { period, remuneracion, meses_cotizados, ... } },
  "SII": { "carpeta_tributaria": { data: { datos_contribuyente, bienes_raices[], F22{año}, ... } } },
  "CMF": { "deuda": { data: { directDebt[], indirectDebt[], credits: { lines[], others[] } } } }
}
```

**Sin scoring**: el portal **no calcula** `score`/`riskLevel`/`maxApprovedAmount`. El staff revisa manualmente el reporte en `/staff/inversionistas` y aprueba reservas con el botón "Habilitar".

Detalles del parser y todos los campos: ver [`src/lib/floid/parse-floid-response.ts`](../src/lib/floid/parse-floid-response.ts) y los tests en `parse-floid-response.test.ts`.

## Modelo de datos

`CreditEvaluation` (Prisma):
- `status`: `PENDING | PROCESSING | COMPLETED | FAILED`
- `summary`: texto corto autogenerado por el parser
- `downloadPdfUrl`: URL al PDF (Floid)
- `rawResponse`: JSON crudo del callback (auditoría + render del detalle)
- `staffNotes`: notas internas del staff (no visibles al inversionista)
- `staffReservationApprovedAt` / `staffReservationApprovedByUserId`: aprobación del gate de reservas
- `score` / `riskLevel` / `maxApprovedAmount`: **siempre null** en el flujo widget (columnas se mantienen por compatibilidad con código histórico)

## Pruebas locales

### Modo stub (sin Floid real)
```bash
# .env.local
FLOID_USE_STUB=true
```
Click en "Iniciar evaluación" en `/evaluacion` completa al toque con un payload simulado. UI funciona end-to-end sin tocar la red.

### Modo real (con widget)
1. Levantar el portal: `npm run dev` en puerto 3002.
2. Crear túnel público: `cloudflared tunnel --url http://localhost:3002`.
3. Configurar Webhook URL del widget en `admin.floid.app` con `<tunnel_url>/api/floid/callback`.
4. Setear `FLOID_WIDGET_URL` en `.env.local` con la URL del widget de `admin.floid.app/<merchant>/widget/<id>`.
5. Setear `FLOID_WEBHOOK_SECRET` (opcional en dev — sin él el callback acepta sin validar y warnea).
6. Reiniciar el portal y entrar a `/evaluacion`.

### Si el shape cambia o hay que descubrir uno nuevo

Existe el commit `f...` (anterior a la limpieza) con un endpoint `/api/floid/capture` que registra cualquier POST sin auth y persiste a `.floid-captures/`. Para usarlo, sacar el archivo de git history y agregarlo temporalmente al repo:

```
git show <commit-anterior>:src/app/api/floid/capture/route.ts > src/app/api/floid/capture/route.ts
```

Después configurar el webhook del widget al endpoint de captura, hacer la corrida, inspeccionar el JSON, adaptar el parser, y **eliminar el endpoint** antes de mergear a producción. **Nunca dejarlo en producción** — no valida auth y persiste PII en disco.

## Troubleshooting

### El popup no se abre
- Tu navegador bloqueó el popup. Permitir popups para el dominio.

### El callback dice "No se encontró evaluación pendiente para custom=..."
- El `custom` que llegó es distinto al `evaluationId` actual. Revisar que el frontend esté pasando bien el query param al abrir el widget.

### El callback persiste FAILED con "Payload del widget incompleto"
- El widget mandó una respuesta sin secciones SP/SII/CMF. Inspeccionar el `rawResponse` persistido en la fila de `CreditEvaluation` (vía Prisma Studio) o reactivar temporalmente el endpoint de captura (ver sección "Si el shape cambia").

### El widget pide credenciales pero después muestra error
- Es flujo Floid, no del portal. Mirar logs del widget en `admin.floid.app`. Errores típicos:
  - `INVALID_CREDENTIALS`: usuario tipeó mal Clave Única.
  - `LOCKED_CREDENTIALS`: ClaveÚnica bloqueada (24h tras 2 intentos fallidos).
  - `TWO_FACTOR_AUTHENTICATION_TIMEOUT`: el código del correo se demoró más que la ventana del widget.

### El shape de la respuesta cambió
Ver la sección "Si el shape cambia" arriba. Reactivar el endpoint de captura desde git history, capturar, parsear, y limpiar antes de mergear.

## Histórico

Antes de migrar al Widget, MaxRent intentaba llamar directo a la API REST de Floid (`/cl/cmf/debt`, `/cl/sii/get_carpeta_tributaria`, etc.). Eso requería capturar Clave Única + Clave Tributaria SII + 2FA dentro del portal — alto riesgo legal y operacional. La integración Widget descarga toda esa complejidad a Floid.

Referencia de la API REST (no usada en flujo actual): [FLOID_API_REFERENCE.md](./FLOID_API_REFERENCE.md).
