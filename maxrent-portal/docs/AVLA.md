# AVLA — Preaprobación crediticia (verificación DICOM manual desde staff)

> Integración con la API de **"seguro de crédito"** de AVLA para verificar manualmente si un inversionista pasa el filtro automático de DICOM/riesgo. Se dispara **desde staff**, NO automáticamente, y NO es visible al inversionista.

## Modelo de negocio

MaxRent **NO contrata póliza propia** con AVLA. Usa la póliza maestra de **Houm** y consume la decisión de AVLA como **proxy de capacidad crediticia**:

```
Staff aprieta "Verificar DICOM" en /staff/inversionistas
  → MaxRent crea solicitud de línea en AVLA bajo póliza de Houm
  → AVLA evalúa automáticamente (DICOM, bloqueos, historial)
  → Si rechaza automático → "Rechazado" en MaxRent
  → Si acepta procesar → "Preaprobado" en MaxRent (independiente de la decisión final)
```

La resolución final de la línea por parte del equipo de riesgo de AVLA puede tardar horas o días — pero MaxRent **no espera esa decisión**. La preaprobación se determina al instante con el primer resultado del filtro automático.

## Definición operativa de "Preaprobado AVLA"

Una línea de crédito en AVLA tiene `stateTags`. La regla:

| Tags incluyen | Resultado MaxRent |
|---|---|
| `rejectedState` o `automaticallyRejectedState` | **Rechazado** |
| Cualquier otro (`waitingForResolution`, `riskBackgroundCompilation`, `activeLineState`, etc.) | **Preaprobado** |
| Sin tags todavía (caso raro) | **Indeterminado** |

Implementado en [`src/lib/services/avla.service.ts`](../src/lib/services/avla.service.ts):

```ts
export function isPreapprovedFromTags(tags: string[]): boolean | null {
  if (tags.length === 0) return null;
  return !tags.some((t) => REJECTED_TAGS.has(t));
}
```

## Flujo técnico

### Disparo
- Botón **"Verificar DICOM"** o **"Re-verificar"** en cada fila de `/staff/inversionistas`.
- Solo habilitado si el usuario tiene **`Profile.rut`** Y **`User.name`** (sin estos, el filtro no funciona).
- Cada disparo crea una fila nueva en `AvlaCheck` (no sobreescribe — staff puede ver historial).

### Backend (`POST /api/staff/users/[userId]/avla-check`)
1. Auth `SUPER_ADMIN`.
2. Lee `User.name` + `Profile.rut` + nombre completo del perfil.
3. Llama `checkPreapproval()` del service:
   1. **Login** a AVLA (JWT, credenciales en base64).
   2. **Listar pólizas** con `stateTags=canRequestLines` — toma la primera.
   3. **Buscar deudor** por RUT (`findPersonDebtorsPaginated`). Si no existe, **crear** (`savePerson`).
   4. **Solicitar línea** por **1 UF** bajo esa póliza (`requestSingleLine`).
   5. **Polling rápido**: 2 intentos con 5s entre ellos al `findLineWithPublicComments`.
   6. Extraer `stateTags` y aplicar la regla de arriba.
   7. **Logout** (libera slot — AVLA limita a 20 sesiones simultáneas).
4. **Persiste** SIEMPRE en `AvlaCheck`, incluso si el flujo falla (queda log para debug).
5. Devuelve `{ ok, check }`.

### UI staff
Columna **"DICOM (AVLA)"** entre Floid y Completada. Cada fila:
- Badge del último check: `Preaprobado` (verde) / `Rechazado` (rojo) / `Indeterminado` (amarillo) / `Error` (gris).
- Botón **"Verificar DICOM"** (primera vez) o **"Re-verificar"** (si ya hay check).
- Si falta perfil → botón deshabilitado con tooltip "Carga primero RUT y nombre".
- Tooltip del badge muestra `state` completo de AVLA + fecha exacta.

### Modelo de datos
Tabla [`avla_checks`](../prisma/schema.prisma) — historial completo, no sobreescribe.

Campos clave:
- `avlaLineId` (`BigInt?`) — id de la línea creada en AVLA. Null si el request falló antes de crear.
- `state` (`String?`) — nombre del estado al momento del check.
- `stateTags` (`String[]`) — array de tags como `["waitingForResolution", ...]`.
- `preapproved` (`Boolean?`) — true/false/null según la regla.
- `requestedAmount` (`Int`) — UF pedidos (default 1).
- `errorMessage` (`String?`) — si el flujo falló (red, login, etc.).
- `rawResponse` (`Json?`) — response cruda de AVLA para auditoría.
- `triggeredByStaffEmail` (`String?`) — quién disparó.
- `createdAt` — ordenado DESC para mostrar el más reciente.

## Detalles técnicos importantes

### Bug de la doc oficial
La doc AVLA dice que el campo en `requestSingleLine` se llama **`requestAmount`** pero el backend lo lee como **`requestedAmount`** (con "ed"). Confirmado en spike — si mandás `requestAmount`, AVLA devuelve `NullPointerException` con stack trace que muestra `getRequestedAmount()`. Nuestro service usa el nombre correcto (`requestedAmount`).

### Credenciales en base64
AVLA exige `username` y `password` codificados en base64 cuando `encrypted: true`. Las credenciales que nos pasó Houm vienen ya pre-encoded — el service las manda tal cual, NO las re-encodea. Si en algún momento futuro Houm cambia a credenciales en texto plano, ajustar `login()` en el service.

### Moneda de la póliza
La póliza de Houm está denominada en **UF** (`moneyDto.shortLabel: "UF"`), no en CLP. Si mandas `requestedAmount: 200000000` AVLA lo lee como **200 millones de UF**, no 200 millones de CLP. Por eso usamos 1 UF como default — solo nos interesa el filtro, no el monto.

### Latencia
Total ~10-15s end-to-end (login + listar póliza + buscar/crear deudor + solicitar línea + 1-2 polls + logout). Por eso el endpoint tiene `maxDuration = 60` y el UI muestra "Verificando…" durante el espera.

### Manejo de errores
El service NUNCA lanza desde `checkPreapproval()`. Devuelve un objeto con `errorMessage` si algo falló. El endpoint persiste igual la fila en `AvlaCheck` con el error — staff lo ve en el badge "Error · fecha" y puede re-verificar.

## Variables de entorno

```bash
# .env.local (NO commitear)
AVLA_BASE_URL=https://external-services-proxy.avla.com/prod_portalclientes
AVLA_COMPANY=<organizationUnitName de Houm>
AVLA_USER=<username de Houm en base64>
AVLA_PASSWORD=<password de Houm en base64>
AVLA_APP_NAME=<appName que dio Houm>
```

Las credenciales son **de Houm**, no de MaxRent. Si AVLA las cambia, hay que coordinar con el equipo dev de Houm.

## Solo hay ambiente de producción

AVLA no nos dio acceso a sandbox/dev. Todas las llamadas van contra producción real de AVLA. Implicaciones:
- Cada check crea una línea real en los libros de Houm (que el equipo de Houm autorizó).
- El monto bajo (1 UF) minimiza la exposición simulada.
- Si esto crece, conviene pedir a Houm que coordine con AVLA un ambiente dev separado.

## Spike previo y aprendizajes

La integración se validó primero con el spike `spike/avla-integration` (ahora consolidado en main). Bugs encontrados durante el spike y resueltos:

1. **Credenciales en base64**: descubierto que Houm las pasa ya encoded, no en texto plano.
2. **Campo `requestAmount` vs `requestedAmount`**: mismatch entre doc y backend.
3. **Moneda UF, no CLP**: la póliza está denominada en UF.
4. **Reestudio vs apertura**: si el deudor ya existe en AVLA, el flujo va a "reestudio" (más lento) en vez de "apertura automática". No cambia la semántica del check (lo único que nos importa es ausencia de `rejectedState`).

Detalle: ver commits con prefijo `spike(avla):` en historial git.

## Pendiente / follow-ups

- **Webhook de resolución**: AVLA puede notificar cuando la línea finalmente se resuelve (estado terminal). Útil si en algún momento queremos saber el `approvedAmount` real (techo de capacidad) en vez de solo "preaprobado sí/no". Configuración: contactar a `soporte.credito@avla.com` con la URL del webhook.
- **Limpieza de líneas**: las líneas que crea MaxRent quedan en los libros de Houm. Si crecen mucho, coordinar limpieza con Houm.
- **Dato en evaluación crediticia**: hoy AVLA es independiente de Floid. Si conviene, en el futuro mostrar ambos juntos en el drawer del inversionista.
