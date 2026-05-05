# MaxRent Portal — Documento de Contexto Completo

> Este documento contiene toda la información necesaria para que un asistente de AI
> (Cursor, Claude, Copilot, etc.) entienda el proyecto, las decisiones tomadas,
> y pueda generar código consistente y de calidad.

---

## 1. VISIÓN DEL PRODUCTO

### Qué es
Portal web donde los clientes/leads de MaxRent pueden gestionar todo su proceso de compra de propiedades usadas para inversión. Es el punto de contacto digital principal entre el cliente y MaxRent.

### Para quién
- **Usuarios principales**: Clientes/leads de MaxRent que quieren comprar una propiedad usada como inversión.
- **Usuarios secundarios**: Equipo interno de MaxRent (admins) que gestiona y monitorea el proceso.

### Flujo del usuario (MVP)
```
1. Lead recibe link (email, WhatsApp, landing) → Llega al portal
2. Se registra con Google o magic link por email → Sin passwords
3. Completa perfil obligatorio (RUT, teléfono) → Onboarding
4. Solicita evaluación crediticia → Backend consulta Floid API
5. Ve resultado (score, riesgo, monto aprobado) → Dashboard
6. Si aprueba → Reserva una propiedad
7. Paga la reserva → Pasarela de pago (Mercado Pago)
8. Recibe confirmación → Email + estado actualizado en portal
```

### Visión futura (post-MVP)
El portal eventualmente cubrirá todo el proceso de compra: evaluación → reserva → documentación → firma → entrega de llaves. Cada etapa se irá agregando como una nueva sección del portal. La arquitectura debe facilitar esto.

---

## 2. DECISIONES DE ARQUITECTURA

### 2.1 Stack tecnológico
| Componente | Tecnología | Razón |
|---|---|---|
| Framework | Next.js 14 (App Router) | Ya lo usa el equipo, SSR + API routes en uno |
| Lenguaje | TypeScript (strict) | Type safety, mejor DX |
| UI | React 18 + Tailwind CSS 3.4 | Ya lo usa el equipo |
| ORM | Prisma 6 | Ya lo usa el equipo, migrations, type-safe queries |
| Base de datos | PostgreSQL (Neon serverless) | Escala sin pagar server idle, free tier generoso |
| Auth | NextAuth.js v5 (Auth.js) | Nativo Next.js, gratuito, Google + magic link |
| Validación | Zod | Validación compartida front/back, type inference |
| Iconos | lucide-react | Consistente, tree-shakeable |
| Fuentes | DM Sans + DM Serif Display | Consistente con branding MaxRent |
| Emails | Resend | API moderna, free tier 3k/mes |
| Hosting | Vercel | Optimizado para Next.js, deploy automático |
| Pasarela de pago | Mercado Pago Checkout Pro | Más fácil en Chile, soporta medios locales |

### 2.2 Patrón arquitectónico: Monolito modular con BFF
**Decisión**: No usar microservicios. Mantener todo en un solo proyecto Next.js pero organizado como si fueran servicios separados.

**Por qué**:
- Para el MVP, microservicios agregan complejidad sin beneficio real
- El equipo ya trabaja con Next.js
- La estructura modular permite extraer servicios después si hace falta (cortar y pegar)

**Cómo se implementa**:
- Las API Routes de Next.js actúan como BFF (Backend for Frontend)
- La lógica de negocio vive en `src/lib/services/` — cada servicio es una clase con responsabilidad única
- Las API routes solo: validan auth → validan input (Zod) → llaman al service → responden JSON
- El frontend NUNCA llama a APIs externas directamente
- Todo pasa por nuestras API routes que actúan como proxy/orquestador

### 2.3 Autenticación: NextAuth.js v5 (no Auth0)
**Decisión**: Usar NextAuth.js v5 con Google OAuth + Resend magic links.

**Por qué NO Auth0**:
- Auth0 cuesta $23+/mes y escala con usuarios
- NextAuth es gratis, nativo de Next.js, y cubre exactamente lo que necesitamos
- Auth0 da un dashboard de admin más completo, pero para un portal de clientes NextAuth es suficiente

**Configuración clave**:
- Sesiones JWT con `maxAge: 30 días` (el usuario queda logueado)
- Custom claims: `id`, `canInvest`, `staffRole`, `onboardingCompleted`, `brokerAccessStatus` en el JWT
- Prisma Adapter sincroniza users/accounts/sessions con la BD
- Evento `createUser`: auto-crea Profile vacío + vincula con Lead existente por email

### 2.4 Hosting: Vercel + Neon (no Railway)
**Decisión**: Migrar de Railway a Vercel + Neon PostgreSQL.

**Por qué**:
- Railway cobra por server encendido 24/7 (~$5-20/mes por servicio)
- Vercel Pro es $20/mes con deploy automático, edge functions, preview deploys
- Neon es PostgreSQL serverless: free tier generoso, pagas por uso real
- Total estimado MVP: $20-40 USD/mes (sin contar Floid)

### 2.5 Pasarela de pago: Mercado Pago
**Decisión**: Mercado Pago Checkout Pro para el MVP.

**Por qué**:
- Más fácil de integrar en Chile
- Checkout Pro maneja toda la UI de pago (no necesitamos construirla)
- Soporta tarjetas, transferencia, y medios locales
- SDK oficial para Node.js
- ~3.5% + IVA por transacción

**Alternativa futura**: Stripe (mejor DX, ya opera en Chile, pero verificar medios de pago locales)

---

## 3. MODELO DE DATOS

### 3.1 Diagrama de relaciones
```
User (NextAuth)
 ├── 1:N Account (OAuth providers)
 ├── 1:N Session
 ├── 1:1 Profile (datos personales + onboarding)
 ├── 1:1 BrokerProfile (datos comerciales si postula a broker)
 ├── 1:N CreditEvaluation (historial de evaluaciones Floid)
 ├── 1:N Reservation (reservas de propiedades)
 ├── 1:N Notification (audit trail de toda comunicación enviada)
 ├── 1:1 Lead (vinculación con lead existente, opcional)
 ├── self → User (sponsorBrokerUserId — broker aprobado que apadrina)
 └── 1:N BrokerInvestorInvite (sent / consumed según rol)

Property
 └── 1:1 PropertyCatalogDraft (staging Houm/CSV antes de publicar)
```

> Diagrama ER completo en formato Mermaid: [`docs/DATABASE.md`](./docs/DATABASE.md). Mantener actualizado al modificar `prisma/schema.prisma`.

### 3.2 Modelos principales

**User** (NextAuth base + extensiones)
- `id` (cuid), `email` (unique), `name`, `image`, `emailVerified`
- `canInvest` (boolean), `staffRole` (NONE | SUPER_ADMIN), `brokerAccessStatus` + `brokerReviewedAt` para flujo broker
- `leadId`: relación opcional con lead existente
- Relaciones: accounts[], sessions[], profile, creditEvaluations[], reservations[]

**Profile** (datos personales obligatorios)
- `userId` (unique FK), `rut` (unique), `phone`, `address`, `commune`, `city`
- `onboardingCompleted`: boolean — controla si puede acceder al resto del portal
- `additionalData`: Json — campo flexible para datos futuros

**CreditEvaluation** (resultado de Floid)
- `userId` (FK), `status`: PENDING → PROCESSING → COMPLETED | FAILED | EXPIRED
- `score`: Int, `riskLevel`: LOW | MEDIUM | HIGH
- `maxApprovedAmount`: Decimal(12,2)
- `summary`: texto legible para el usuario
- `rawResponse`: Json — respuesta completa de Floid para auditoría
- `errorMessage`: si falló, por qué
- Índice en [userId, status]

**Reservation** (reserva de propiedad)
- `userId` (FK), `evaluationId` (FK opcional), `propertyId`, `propertyName`
- `status`: PENDING_PAYMENT → PAYMENT_PROCESSING → PAID → CONFIRMED | CANCELLED | EXPIRED | REFUNDED
- `amount`: Decimal(12,2), `currency`: default "CLP"
- Campos de pago: `paymentExternalId`, `paymentMethod`, `paymentUrl`, `paidAt`
- `expiresAt`: cuándo expira si no se paga (default 48h)
- `metadata`: Json — datos extra del pago o propiedad
- Índices en [userId, status] y [paymentExternalId]

**Lead** (capturado desde el landing inversionista o vendedor — fuente única de leads)
- `id`, `email` (unique), `kind` (`LeadKind`: INVESTOR / SELLER / **BROKER**), `status` (`LeadStatus`: NEW → INVITED → REGISTERED → CONVERTED, o DISCARDED).
- Datos personales (snapshot del form): `firstName`, `lastName`, `name` (compatibilidad), `phone`.
- Campos solo de vendedor: `cantidadPropiedades`, `arrendadas`, `adminHoum`.
- Origen y atribución: `source` (`landing-investor`, `landing-seller`, `broker-invite`…), `marketingAttribution` (UTMs, gclid, referrer, captured_at).
- `data` Json para flujos futuros sin migrar.
- Relación 1:1 con `User` (cuando el lead se registra en el portal). `User.leadId` es la FK; el evento `createUser` de NextAuth la setea por match de email, y el GET de `/api/users/profile` también vincula por email para cuentas pre-existentes al lead.

**Notification** (audit trail de toda comunicación saliente del portal)
- `id`, `channel` (`NotificationChannel`: EMAIL / SMS / WHATSAPP / PUSH), `templateKey` (ej. `welcome-investor`, `magic-link`, `reservation-confirmed`).
- `recipient` (email o E.164 phone), `userId` (FK opcional — null para envíos a Lead sin cuenta).
- `variables` Json (snapshot de las variables que renderizaron el template).
- `status` (`NotificationStatus`: QUEUED → SENT → DELIVERED / OPENED / BOUNCED / COMPLAINED / FAILED).
- `provider` (slug del adapter: `resend`, etc.), `providerMessageId`, `providerResponse` (auditoría).
- `errorMessage`, `scheduledAt`, `sentAt`, `deliveredAt`, `openedAt`.
- Toda comunicación pasa por `lib/services/notifications` (vendor-agnostic). Cambiar de proveedor = 1 env var. Decisión arquitectónica: `memory/project_notifications_infra.md` y [README de la capa](./src/lib/services/notifications/README.md).

**BrokerProfile** (datos comerciales para postular al canal broker)
- `userId` (PK + FK 1:1), `companyName`, `jobTitle`, `isIndependent`, `websiteUrl`, `linkedinUrl`, `pitch` (Text).
- Separado del `Profile` inversionista — un mismo `User` puede ser inversionista, broker aprobado y staff simultáneamente.

**BrokerInvestorInvite** (invitación single-use de broker → inversionista)
- `id`, `token` (unique, en URL `/i/[token]`), `brokerUserId` (FK), `inviteeEmail` (opcional), `status` (PENDING / COMPLETED / EXPIRED), `registeredUserId` (FK al User que claimea).
- Al claimear, setea `User.sponsorBrokerUserId` del invitado.

**Property + PropertyCatalogDraft** (inventario + staging)
- `Property`: `inventoryCode` y `houmPropertyId` como business keys únicas; `status` (AVAILABLE / RESERVED / SOLD / ARCHIVED), `visibleToBrokers`, `metadata` Json.
- `PropertyCatalogDraft`: filas de staging (CSV o sync Houm) hasta que staff aprueba la publicación. Ver `docs/HOUM_CATALOG_METADATA.md` y `docs/PROPERTY_INVENTORY_IMPORT.md`.

### 3.3 Enums
```typescript
enum StaffRole                  { NONE, SUPER_ADMIN }
enum BrokerAccessStatus         { PENDING, APPROVED, REJECTED }
enum BrokerInvestorInviteStatus { PENDING, COMPLETED, EXPIRED }
enum LeadKind                   { INVESTOR, SELLER, BROKER }
enum LeadStatus                 { NEW, INVITED, REGISTERED, CONVERTED, DISCARDED }
enum PropertyStatus             { AVAILABLE, RESERVED, SOLD, ARCHIVED }
enum CatalogDraftSource         { HOUM, CSV }
enum PropertyCatalogDraftStatus { PENDING, REJECTED, APPROVED }
enum EvaluationStatus           { PENDING, PROCESSING, COMPLETED, FAILED, EXPIRED }
enum RiskLevel                  { LOW, MEDIUM, HIGH }
enum ReservationStatus          { PENDING_PAYMENT, PAYMENT_PROCESSING, PAID, CONFIRMED, CANCELLED, EXPIRED, REFUNDED }
enum NotificationChannel        { EMAIL, SMS, WHATSAPP, PUSH }
enum NotificationStatus         { QUEUED, SENT, DELIVERED, OPENED, BOUNCED, COMPLAINED, FAILED }
```

---

## 4. ESTRUCTURA DEL PROYECTO

```
maxrent-portal/
├── prisma/
│   └── schema.prisma           ← Modelos de datos completos
├── src/
│   ├── app/
│   │   ├── layout.tsx          ← Root layout + SessionProvider + fuentes
│   │   ├── globals.css         ← Tailwind imports + custom CSS
│   │   ├── page.tsx            ← Landing pública
│   │   ├── (auth)/
│   │   │   └── login/page.tsx  ← Login (Google + magic link)
│   │   ├── (portal)/           ← RUTAS PROTEGIDAS (requieren auth)
│   │   │   ├── layout.tsx      ← Layout con sidebar
│   │   │   ├── dashboard/page.tsx  ← Vista principal + progress
│   │   │   ├── perfil/page.tsx     ← Formulario onboarding/edición
│   │   │   ├── evaluacion/page.tsx ← Resultado crediticio
│   │   │   └── reserva/page.tsx    ← Lista de reservas
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts  ← NextAuth (automático)
│   │       ├── users/profile/route.ts       ← GET/PUT perfil
│   │       ├── floid/
│   │       │   ├── evaluate/route.ts        ← POST solicitar evaluación
│   │       │   └── evaluations/route.ts     ← GET listar evaluaciones
│   │       ├── reservations/route.ts        ← GET/POST reservas
│   │       └── payments/
│   │           ├── checkout/route.ts        ← POST crear checkout
│   │           └── webhook/route.ts         ← POST webhook pasarela
│   ├── components/
│   │   ├── Logo.tsx            ← Wordmark MaxRent by Houm (prop tone="light|dark")
│   │   ├── portal/sidebar.tsx  ← Sidebar inversionista (con switch al portal broker
│   │   │                         para cuentas multi-rol)
│   │   ├── broker/broker-sidebar.tsx ← Sidebar broker (con switch al portal inversionista)
│   │   ├── floid/              ← Reporte Floid (summary + detail)
│   │   ├── staff/              ← Componentes panel interno
│   │   └── ui/                 ← Componentes reutilizables (por crear)
│   ├── lib/
│   │   ├── auth.ts             ← Configuración NextAuth.js v5
│   │   ├── prisma.ts           ← Singleton Prisma Client
│   │   ├── validations.ts      ← Schemas Zod (profileSchema, reservationSchema)
│   │   └── services/
│   │       ├── floid.service.ts    ← [STUB] Evaluación crediticia
│   │       └── payment.service.ts  ← [STUB] Pasarela de pago
│   └── middleware.ts           ← Protección de rutas + onboarding redirect
├── .cursorrules                ← Contexto para Cursor AI
├── .cursor/prompts/            ← Prompts pre-armados para tareas comunes
├── .env.example                ← Variables de entorno documentadas
├── SETUP.md                    ← Guía de instalación paso a paso
├── CONTEXTO-PROYECTO.md        ← Este archivo
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── next.config.ts
└── .gitignore
```

---

## 5. API ENDPOINTS

### Autenticación (NextAuth — automático)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/auth/signin` | Página de login |
| GET | `/api/auth/session` | Sesión actual |
| POST | `/api/auth/callback/*` | Callbacks OAuth/magic link |

### Captura de leads (público — landing → portal)
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/public/leads` | No | Recibe el body del form del landing (inversionista o vendedor). Upsert idempotente de `Lead` por email. Para `kind=INVESTOR` nuevo, dispara welcome email vía la capa de notifications. |

CORS: orígenes permitidos vía `LEADS_ALLOWED_ORIGINS` (CSV). Por defecto: `https://www.maxrent.cl` y `https://maxrent.cl`. En non-prod, también `*.vercel.app`.

### Notifications (público — webhook firmado)
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/notifications/webhook/resend` | No* | Recibe eventos de delivery de Resend (delivered/bounced/opened/etc.) y actualiza la fila de `Notification` por `providerMessageId`. |

*Validado con firma Svix usando `RESEND_WEBHOOK_SECRET`. Sin la env var, rechaza con 401.

### Perfil de usuario
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/users/profile` | Sí | Obtener perfil. Si el `Profile` está vacío y hay `Lead` vinculado (por `leadId` o por match de email), devuelve datos del Lead como fallback (firstName/lastName/contactEmail/phone) y también propaga `marketingAttribution` al `additionalData` (best-effort). |
| PUT | `/api/users/profile` | Sí | Actualizar perfil + completar onboarding |

### Evaluación crediticia (Floid)
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/floid/evaluate` | Sí | Solicitar nueva evaluación |
| GET | `/api/floid/evaluations` | Sí | Listar evaluaciones del usuario |
| POST | `/api/floid/callback` | No* | Callback async de Floid |

*Webhook firmado por Floid; ver `docs/FLOID_API_REFERENCE.md`.

### Reservas
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/reservations` | Sí | Listar reservas del usuario |
| POST | `/api/reservations` | Sí | Crear nueva reserva |

### Pagos
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/payments/checkout` | Sí | Generar URL de checkout |
| POST | `/api/payments/webhook` | No* | Webhook de confirmación de pago |

*El webhook no usa auth de usuario pero debe validar firma de la pasarela.

### Broker (autenticado, flujo `/broker/*`)
APIs bajo `/api/broker/*` para postulación, perfil, oportunidades visibles, invites a inversionistas, etc.

### Staff (`SUPER_ADMIN` only)
APIs bajo `/api/staff/*` para inventario, aprobación de brokers, gestión de inversionistas, notas de evaluaciones, etc.

---

## 6. FLUJOS TÉCNICOS DETALLADOS

### 6.0 Captura de Lead desde el landing
```
1. Inversionista llena el form en https://www.maxrent.cl
2. POST {PORTAL_URL}/api/public/leads (CORS permitido para www.maxrent.cl)
   → upsert Lead por email (idempotente; refresca datos pero no degrada status)
   → si es Lead nuevo de tipo INVESTOR, dispara welcome email vía notifyTemplate()
     (fire-and-forget; cualquier fallo queda en Notification con status=FAILED)
3. Landing muestra pantalla "Recibimos tus datos" con CTA "Continuar al portal →"
4. Click → redirige a {PORTAL_URL}/login?email=...&newLead=1&callbackUrl=/perfil
5. /login del portal lee los query params:
   - Banner verde de bienvenida con el email del lead
   - Input de magic link pre-llenado
   - signIn de Google con login_hint para preseleccionar la cuenta (1 click)
```

Vendedor sigue el mismo POST pero NO entra al portal — staff lo contacta.

### 6.1 Registro + Onboarding (signup vía Google o magic link)
```
1. Usuario llega a /login (típicamente desde el header del landing,
   con callbackUrl preconfigurado: /dashboard para Portal inversionista,
   /broker/oportunidades para Portal broker — ver sección 7).
   La pantalla del /login adapta su heading según el callbackUrl:
   "Portal Inversionista" / "Portal Broker" / "Acceso Staff".
2. Elige Google OAuth o ingresa email para magic link (Resend, vía la
   capa de notifications: el envío queda registrado en Notification con
   templateKey="magic-link")
3. NextAuth maneja el flujo completo
4. Al crear usuario (evento createUser):
   a. Busca Lead por email del User
   b. Crea Profile (con additionalData.marketingAttribution sembrada
      desde el Lead si existe)
   c. Si encontró Lead, setea User.leadId
   d. backfillUserNotifications: las notificaciones enviadas pre-cuenta
      (welcome email al Lead) se asocian al User.id para timeline completo
5. Middleware detecta onboardingCompleted=false → redirige a /perfil
6. /perfil llama GET /api/users/profile que devuelve hidratado con Lead:
   firstName, lastName, contactEmail, phone vienen pre-llenados.
   Si user.leadId estaba null pero hay Lead con email match, vincula
   en background (best-effort) y propaga marketingAttribution al
   Profile.additionalData.
7. Usuario completa lo que falta (RUT, dirección, ciudad, comuna, datos
   laborales) → PUT /api/users/profile
8. API valida con Zod, verifica RUT único, actualiza Profile
9. Se marca onboardingCompleted=true → se actualiza sesión JWT
10. Redirige a /dashboard
```

### 6.2 Evaluación crediticia
```
1. Usuario en /evaluacion, clickea "Solicitar evaluación"
2. POST /api/floid/evaluate
3. API verifica: auth ✓, perfil completo ✓, no hay eval pendiente ✓
4. floidService.requestEvaluation(userId):
   a. Obtiene RUT del profile
   b. Crea CreditEvaluation con status=PENDING
   c. Actualiza a PROCESSING
   d. Llama a Floid API con el RUT
   e. Parsea respuesta → score, riskLevel, maxApprovedAmount, summary
   f. Guarda rawResponse completo (auditoría)
   g. Actualiza a COMPLETED (o FAILED si error)
5. Frontend muestra resultado con polling (cada 5s si está en PENDING/PROCESSING)
6. Si score es LOW/MEDIUM risk → CTA para reservar propiedad
```

### 6.3 Reserva + Pago
```
1. Usuario en /reserva, selecciona propiedad
2. POST /api/reservations → crea Reservation con status=PENDING_PAYMENT, expiresAt=48h
3. Usuario clickea "Pagar" → POST /api/payments/checkout con reservationId
4. paymentService.createCheckout():
   a. Crea preferencia de pago en Mercado Pago
   b. Guarda paymentExternalId y paymentUrl en la reserva
   c. Actualiza status a PAYMENT_PROCESSING
   d. Retorna checkoutUrl
5. Frontend redirige al checkout de Mercado Pago
6. Usuario paga en MP
7. MP envía webhook → POST /api/payments/webhook
8. Verificar firma → obtener detalle del pago → paymentService.handleWebhook()
9. Si aprobado: status=PAID, guardar paymentMethod y paidAt
10. (Futuro) Enviar email de confirmación
```

---

## 7. PROTECCIÓN DE RUTAS (Middleware)

```
Ruta pública:       /, /login, /staff/login, /brokers, /i/[token]
API pública:        /api/auth/*, /api/public/*, /api/notifications/webhook/*,
                    /api/payments/webhook, /api/floid/callback
Ruta protegida:     Todo lo demás → requiere auth.

Si NO logueado + ruta protegida → Redirect a /login?callbackUrl=...
Si logueado + !onboarding       → Redirect a /perfil (excepto /perfil y /api)
```

### Redirects post-login según puerta de entrada

**REGLA FUNDAMENTAL**: el acceso a `/staff` está aislado de la puerta principal del marketing. Hay dos puertas de login:

#### `/login` — puerta del marketing (linkeada desde el header del landing)
Nunca redirige a `/staff`, **aunque la cuenta sea SUPER_ADMIN**. El header del landing tiene dos enlaces a esta puerta con `callbackUrl` preconfigurado:
- `Portal inversionista` → `/login?callbackUrl=/dashboard`
- `Portal broker` → `/login?callbackUrl=/broker/oportunidades`

Lógica del redirect cuando el usuario logueado entra a `/login`:
1. Si hay `callbackUrl` interno seguro y NO empieza con `/staff` → respeta callback.
2. Si `canInvest` → `/dashboard`.
3. Si `brokerAccessStatus = APPROVED` → `/broker/oportunidades`.
4. Si `brokerAccessStatus = PENDING` → `/broker/pending`.
5. Fallback → `/dashboard` (el sub-middleware de onboarding decide).

#### `/staff/login` — puerta interna (URL no enlazada desde marketing)
Única vía a `/staff/*`. El SUPER_ADMIN la conoce y la usa directo. No aparece en headers ni en footers.

### Switch entre portales para cuentas multi-rol

Una misma cuenta puede tener `canInvest=true` Y `brokerAccessStatus=APPROVED`. Para cambiar de área sin re-login:
- Sidebar inversionista (`Sidebar`): muestra al final un link al portal broker (`/broker/oportunidades` si APPROVED, `/broker/pending` si PENDING, `/broker/rechazado` si REJECTED). No se muestra si `brokerAccessStatus = null`.
- Sidebar broker (`BrokerSidebar`): siempre muestra al final un link al portal inversionista si `canInvest = true`.

Helper: `brokerSwitchHrefFor()` en `components/portal/sidebar.tsx`.

---

## 8. INTEGRACIONES EXTERNAS

### 8.1 Floid (evaluación crediticia) — PENDIENTE
- **Estado**: Stub con datos simulados
- **Archivo**: `src/lib/services/floid.service.ts`
- **Qué falta**: Contactar Floid, obtener documentación API, reemplazar `callFloidApi()`
- **Variables**: `FLOID_API_KEY`, `FLOID_API_URL`
- **El stub simula**: score entre 300-850, risk level basado en score, monto aprobado proporcional

### 8.2 Mercado Pago (pasarela de pago) — PENDIENTE
- **Estado**: Stub
- **Archivo**: `src/lib/services/payment.service.ts`
- **Qué falta**: Crear cuenta de desarrollador MP, obtener access token, instalar SDK
- **SDK**: `npm install mercadopago`
- **Variables**: `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_PUBLIC_KEY`
- **Código de referencia**: hay implementación completa comentada en el service

### 8.3 Resend (vía capa propia de notifications) — OPERATIVO
- **Estado**: dominio `maxrent.cl` verificado (DKIM/SPF/DMARC), API key + sender `MaxRent <hola@maxrent.cl>` configurados, webhook de delivery tracking conectado.
- **Templates activos**: `welcome-investor` (lead → portal), `magic-link` (NextAuth pasa por la capa propia, también queda tracked).
- **Variables**:
  - `EMAIL_PROVIDER` (default `resend`; cambiar adapter = 1 env var)
  - `RESEND_API_KEY` (Sending access scope)
  - `EMAIL_FROM` (`MaxRent <hola@maxrent.cl>`)
  - `RESEND_WEBHOOK_SECRET` (firma Svix; sin esto, webhook devuelve 401)
- **Audit trail**: tabla `Notification` registra cada envío con QUEUED → SENT → DELIVERED/OPENED/BOUNCED.
- **Capa de servicio**: `src/lib/services/notifications/` (vendor-agnostic). API: `notify()`, `notifyTemplate()`, `backfillUserNotifications()`. Templates en react-email (`templates/*.tsx`).
- **Decisión arquitectónica**: `memory/project_notifications_infra.md`.
- **Cómo agregar un template**: ver [README de la capa](./src/lib/services/notifications/README.md).
- **Cómo agregar otro provider**: implementar `EmailProvider` en `providers/email-<slug>.ts`, registrarlo, cambiar env `EMAIL_PROVIDER=<slug>`. Sin cambios en negocio.

### 8.4 Captura de leads (landing → portal) — OPERATIVO
- **Estado**: el form del landing inversionista/vendedor en `https://www.maxrent.cl` apunta a `POST {PORTAL_URL}/api/public/leads` (no más DB del landing).
- **Una sola DB**: leads viven en la misma Neon del portal. El modelo `Lead` se extendió para recibir todos los datos del form (firstName, lastName, phone, kind, marketingAttribution, campos vendedor).
- **Vinculación con User**: por `User.leadId` cuando el evento `createUser` matchea por email; o por email match en el GET de `/api/users/profile` para cuentas pre-existentes al lead.
- **Welcome email**: tras crear Lead nuevo INVESTOR, se dispara automáticamente vía la capa de notifications.

---

## 9. COSTO ESTIMADO MENSUAL

| Servicio | Costo |
|---|---|
| Vercel Pro | $20 USD |
| Neon PostgreSQL | $0 – $19 USD |
| NextAuth.js | $0 (open source) |
| Resend emails | $0 (free tier: 3k/mes) |
| Dominio | ~$1.5 USD |
| Mercado Pago | ~3.5% + IVA por transacción |
| Floid API | Variable (según contrato) |
| **Total fijo (sin Floid)** | **$20 – $40 USD/mes** |

---

## 9.5 IDENTIDAD DE MARCA EN EL PORTAL

El portal hereda la identidad de marca del landing público (`BRIEF.md` del repo raíz):

- **Logo**: componente `<Logo size="sm|md|lg" tone="light|dark" />`. Misma SVG que el landing con prop `tone` extra:
  - `tone="light"` (default): wordmark crema (`#EDE0CC`) para fondos oscuros.
  - `tone="dark"`: wordmark navy (`#001F30`) para fondos claros del portal (sidebars, login).
  Se usa en `sidebar.tsx`, `broker-sidebar.tsx` y `(auth)/login/login-content.tsx`.
- **Tipografía**: `DM Sans` (var `--font-dm-sans`) para el cuerpo, `DM Serif Display` (var `--font-dm-serif`) para los headings principales (`h1` de Dashboard, Perfil, Evaluación, Reservas, Oportunidades, Login). Ambas cargadas en `app/layout.tsx`.
- **Colores MaxRent en `tailwind.config.ts`**: `dark` (#001F30), `cream` (#FBF7F3), `orange.DEFAULT/2/light`. Coexisten con la paleta `broker.*` corporativa que ya existía.
- **Login screen** usa `bg-cream`, logo grande, heading serif, botón "Enviar link de acceso" en naranja MaxRent.
- **CTAs primarios del portal autenticado** (Save, etc.) **siguen siendo azules** (`bg-blue-600`) — decisión de producto para mantener foco funcional. El naranja es solo para puntos de transición landing→portal (login).
- **Sidebar item activo** sigue `bg-blue-50 text-blue-700` (sin tocar la UX existente).

---

## 10. CONVENCIONES DE CÓDIGO

- **Lenguaje**: TypeScript estricto, nunca `any`, preferir `unknown` + type narrowing
- **Imports**: alias `@/` mapea a `src/`
- **Páginas**: Server Components por defecto, `"use client"` solo cuando hace falta
- **API Routes**: funciones nombradas GET, POST, PUT, DELETE en `route.ts`
- **Validación**: schemas Zod en `lib/validations.ts`, usar `.safeParse()` en API routes
- **Servicios**: clases en `lib/services/`, exportar singleton al final del archivo
- **Estilos**: Tailwind utility classes, no CSS modules, no styled-components
- **Componentes**: funcionales, props tipadas con interface/type
- **Errores**: try/catch en services, respuestas JSON consistentes `{ error: string }` o `{ data }`
- **Commits**: en español, descriptivos

---

## 11. SECUENCIA DE IMPLEMENTACIÓN RECOMENDADA

### Fase 1 — Fundamento ✅
- [x] Estructura del proyecto
- [x] Prisma schema completo (con migraciones automáticas en build de Vercel)
- [x] Auth (Google + magic link via capa propia de notifications)
- [x] Middleware de protección + onboarding redirect
- [x] Pages: login, dashboard, perfil, evaluación, reserva
- [x] API routes funcionales
- [x] Deploy a Vercel — dominio `portal.maxrent.cl` con SSL.

### Fase 2 — Integraciones ✅ / 🟡
- [x] Floid Widget (sandbox + prod) — `docs/FLOID_API_REFERENCE.md`, `docs/FLOID_SETUP.md`.
- [x] Resend (dominio verificado, sender `hola@maxrent.cl`, webhook delivery tracking).
- [x] Capa propia de comunicaciones vendor-agnostic — `lib/services/notifications` (welcome + magic link, audit trail completo).
- [ ] Mercado Pago Checkout Pro (pendiente — stub en `lib/services/payment.service.ts`).
- [ ] Webhook de Mercado Pago.

### Fase 3 — Captura y derivación ✅
- [x] Endpoint público `POST /api/public/leads` para form del landing.
- [x] Una sola DB (Neon) entre landing y portal — modelo `Lead` extendido.
- [x] Handoff landing → portal con magic link / Google preseleccionado.
- [x] Onboarding pre-rellenado con datos del Lead.
- [x] Atribución de marketing propagada al `Profile.additionalData`.
- [x] Limpieza: endpoint legacy `/api/leads` del landing eliminado.

### Fase 4 — Gestión 🟡
- [x] Panel staff (`/staff`, `/staff/login`) — inventario, aprobación brokers, gestión de inversionistas.
- [x] Catálogo de propiedades vía `Property` + `PropertyCatalogDraft` (Houm sync + CSV import).
- [x] Flujo broker (postulación, oportunidades, invites a inversionistas).

### Fase 5 — Madurez 🟡 / ❌
- [ ] Más templates de email (reservación confirmada, evaluación lista, recordatorios, recibos).
- [ ] Multi-canal (WhatsApp/SMS) cuando aplique — la infra ya está preparada (`channel` enum, providers folder).
- [ ] Tests (vitest + testing-library) — base mínima existe (`vitest.config.ts`).
- [ ] Rate limiting en endpoints públicos (`/api/public/leads`).
- [ ] Logging y error tracking (Sentry o equivalente).
- [ ] Monitoring (Vercel Analytics ya activo).
