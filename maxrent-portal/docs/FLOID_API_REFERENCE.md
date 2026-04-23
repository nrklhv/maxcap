# Floid API — referencia (resumen operativo)

Documentación de apoyo basada en la colección / guía de integración Floid. La fuente oficial sigue siendo [docs.floid.io](https://docs.floid.io/). Para **configurar y probar el portal MaxRent**, usá primero [FLOID_SETUP.md](./FLOID_SETUP.md).

## Contrato general

- **Protocolo:** solo **HTTPS**. Cualquier otro protocolo o token inválido produce error.
- **Formato:** REST; respuestas en **JSON** con códigos HTTP acordes al resultado.
- **Headers obligatorios (cuando hay body JSON):**
  - `Content-Type: application/json`
  - `Authorization: Bearer <token>` — el token lo entrega el equipo Floid; permisos se gestionan en el backoffice Floid.

## Síncrono vs asíncrono

| Modo | Body | Comportamiento |
|------|------|----------------|
| **Síncrono** | Sin `callbackUrl` (o según producto) | El resultado útil llega en la **misma** respuesta HTTP del `POST`. |
| **Asíncrono** | Incluye `callbackUrl` con URL **HTTPS** pública | Primera respuesta: HTTP **200** o **400**; suele incluir **`caseid`**. El resultado final se envía en un **POST** a tu `callbackUrl` cuando termina el proceso. |

Campos comunes del body (además de los propios de cada producto):

- **`caseid`** (opcional): si no lo envías, Floid genera uno. Si lo envías, Floid reutiliza ese identificador.
- **`callbackUrl`** (opcional): si está presente, el flujo puede ser asíncrono según el producto.

## Credenciales y bloqueos

- Tras **dos consultas consecutivas** con credenciales incorrectas, Floid puede aplicar un **bloqueo preventivo** (se levanta solo a las **24 horas**).
- **`unlock_credentials: true`** en el body: desbloqueo manual; el cliente asume riesgo de **bloqueo definitivo** en la entidad (banco/estatal).
- **Desbloquear sin consultar el servicio:** omitir `password` en el body, solo `id` (y `unlock_credentials` según doc).

## Forma típica de errores (400, etc.)

Muchos endpoints devuelven estructuras del estilo:

```json
{
  "code": 400,
  "error_type": "LOGIN",
  "error_code": "INVALID_CREDENTIALS",
  "error_message": "the provided credentials are invalid",
  "display_message": "Mensaje para mostrar al usuario final",
  "caseid": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

Los valores exactos dependen del producto (`INVALID_ID`, `LOCKED_CREDENTIALS`, `API_ERROR`, etc.).

## Segundo factor (ejemplo CMF Deuda V2)

Algunos productos pueden responder primero con **`2fa_required`** (p. ej. HTTP/código de negocio indicando que hay que continuar). En ese caso la documentación Floid indica una **segunda request** con el mismo `caseid`, `continue: true` y el token recibido (p. ej. por correo). El portal MaxRent **no implementa hoy** ese flujo multi-paso; si el producto contratado lo exige, hay que extender la integración.

## Widget (no usado por el portal Next actual)

Floid ofrece **Widget** en el admin: webhook de reportes, redirect al terminar, parámetros en query (`custom`, `id` para autollenar RUT). Es un camino alternativo a llamar la API desde servidor. El flujo de **`/evaluacion`** del portal usa **API server-side** vía `floid.service.ts`, no el widget embebido.

---

## Índice de endpoints (colección Chile / otros)

Prefijo típico: `{{HOST}}` es la base que te indique Floid (p. ej. alineada a `FLOID_API_URL` en el portal). Todos son **`POST`** salvo que tu contrato diga lo contrario.

### Chile — `{{HOST}}/cl/...`

| Ruta | Tema |
|------|------|
| `/cl/registrocivil/defuncion` | Defunción / verificación identidad (opción 1: `id`; opción 2: datos personales + `birthdate`) |
| `/cl/registrocivil/consulta_multas` | Multas por patente |
| `/cl/cmf/fondos` | Fondos CMF (`fecha_inicio`, `fecha_fin`, `lista_runs`, …) |
| `/cl/cmf/debt_v2` | Deuda CMF vía Clave Única (`id`, `password`; posible 2FA) |
| `/cl/sii/get_depuracion_renta` | Renta independiente (`login_type`, `id`, `password`) |
| `/cl/sii/get_renta` | Renta SII (`periodo`, etc.) |
| `/cl/sii/suscripcion_carpeta_tributaria` | Suscripción carpeta tributaria (`rut_login`, `institucion`, `vigencia`, …) |
| `/cl/sii/factibilidad_cesion` | Factibilidad cesión DTE (credenciales SII o certificado) |
| `/cl/banco_santander_personas/incomev2` | Ingresos estimados v2 (`id`, `password`, `account_number`; opc. `show_transactions`) |
| `/cl/banco_estado_personas/transactions` | Movimientos BancoEstado |
| `/cl/banco_estado_personas/income` | Ingresos estimados |
| `/cl/banco_estado_personas/incomev2` | Ingresos v2 |
| `/cl/banco_estado_personas/credit_cards_info` | Productos / tarjetas |
| `/cl/banco_scotia_personas/products` | Productos Scotiabank |
| `/cl/banco_scotia_personas/transactions` | Movimientos |
| `/cl/banco_scotia_personas/contacts` | Contactos |
| `/cl/banco_falabella_personas/credit_cards_info` | Tarjetas / productos Falabella |
| `/cl/banco_ripley_personas/transactions` | Movimientos Ripley |
| `/cl/banco_ripley_personas/income` | Ingresos Ripley |
| `/cl/banco_ripley_personas/incomev2` | Ingresos v2 Ripley |
| `/cl/banco_bci_empresas/validar` | Validar login BCI empresas (`id`, `password`, `company_id`) |

Muchos endpoints bancarios aceptan opcionalmente **`caseid`**, **`unlock_credentials`**, y a veces **`callbackUrl`** según el producto.

### Colombia — `{{HOST}}/co/...`

| Ruta | Tema |
|------|------|
| `/co/banco_bbva_personas/products` | Productos |
| `/co/banco_bbva_personas/transactions` | Movimientos |

### Perú — `{{HOST}}/pe/...`

| Ruta | Tema |
|------|------|
| `/pe/sunat/informacion_empresa` | Datos empresa por RUC |
| `/pe/sunat/ficha_ruc` | Ficha contribuyente |
| `/pe/sunat/facturas` | Facturas (rango de fechas máx. 31 días) |
| `/pe/banco_bcp_personas/products` | Productos BCP |
| `/pe/banco_bcp_personas/validate_account` | Validar cuenta o CCI |
| `/pe/banco_bcp_personas/get_cci` | Obtener CCI |

---

## Relación con MaxRent (lectura rápida)

El portal **no** reexpone todos estos endpoints. Solo usa **`FLOID_SERVICE_PATH`** apuntando al **producto que hayan habilitado** para tu token, y envía un body mínimo documentado en [FLOID_SETUP.md](./FLOID_SETUP.md) (RUT en el campo configurable, `caseid` interno, `callbackUrl` opcional). Si el producto exige **`password`** u otros campos que el portal no envía, la llamada fallará o devolverá error hasta alinear contrato o código.
