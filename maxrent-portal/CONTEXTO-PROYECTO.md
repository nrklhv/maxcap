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
 ├── 1:N BrokerInvestorInvite (sent / consumed según rol)
 ├── 1:N Referral (referrals como referidor — código INV-)
 ├── 1:1 Referral (como referido — única atribución posible)
 ├── 1:N BrokerLead (clientes traídos como broker — código BRK-)
 └── 1:1 BrokerLead (como prospect traído por broker)

Lead
 ├── 1:1 Referral (atribución peer-to-peer cuando llegó con ?ref=INV-XXX)
 └── 1:1 BrokerLead (atribución comercial cuando llegó con ?ref=BRK-XXX)

Property
 └── 1:1 PropertyCatalogDraft (staging Houm/CSV antes de publicar)

Pool (Producto 2 — portafolio de propiedades arrendadas)
 └── 1:N PoolUnit
      └── 1:N Reservation (via Reservation.poolUnitId; XOR con propertyId)
```

> Diagrama ER completo en formato Mermaid: [`docs/DATABASE.md`](./docs/DATABASE.md). Mantener actualizado al modificar `prisma/schema.prisma`.

### 3.2 Modelos principales

**User** (NextAuth base + extensiones)
- `id` (cuid), `email` (unique), `name`, `image`, `emailVerified`
- `canInvest` (boolean), `staffRole` (NONE | SUPER_ADMIN), `brokerAccessStatus` + `brokerReviewedAt` para flujo broker
- `leadId`: relación opcional con lead existente
- `investorReferralCode` (unique, prefijo `INV-`): code para compartir como peer-to-peer. Generado al cumplir `canInvest`.
- `brokerReferralCode` (unique, prefijo `BRK-`): code para compartir como broker. Generado al pasar a `brokerAccessStatus = APPROVED` (en `approveBroker()`, ver `services/broker.service.ts`).
- Relaciones: accounts[], sessions[], profile, creditEvaluations[], reservations[], referralsAsReferrer[], referralAsReferred (1:1), brokerLeadsAsBroker[], brokerLeadAsProspect (1:1)

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

**Referral** (atribución peer-to-peer entre inversionistas)
- `id`, `code` (denormalizado de `User.investorReferralCode`, formato `INV-XXXXXX`), `referrerUserId` (FK), `referredEmail`, `referredUserId` (FK unique opcional), `leadId` (FK unique, **NOT NULL** — siempre se crea Lead primero).
- `status` (`ReferralStatus`: PENDING → SIGNED_UP → QUALIFIED → SIGNED, o EXPIRED).
- Timestamps de transición: `signedUpAt`, `qualifiedAt`, `signedAt`. `expiresAt` cubre dos hitos (createdAt+60d antes de SIGNED_UP, signedUpAt+120d después).
- `rewardCLP` (default `500000`): monto fijo a pagar al referidor cuando el referido escritura. Constante de negocio en v1; columna por si en el futuro se hacen campañas con montos distintos.
- `payoutStatus` (`PayoutStatus`: PENDING / PAID), `paidAt`, `payoutNote` (texto libre que escribe staff al transferir, ej. `"Transferencia BCI ref 12345 - 15-may-2026"`).
- **El beneficio es siempre del referidor, nunca del referido.** No hay descuento ni nada para el referido — entra en condiciones idénticas a cualquier inversionista.
- **Sin tope de referidos por usuario en v1.** Acumulable.
- Detalle full en `docs/DATABASE.md` sección "Atribución de referidos".

**BrokerLead** (atribución comercial — broker trae cliente)
- `id`, `code` (de `User.brokerReferralCode`, formato `BRK-XXXXXX`), `brokerUserId` (FK), `prospectEmail`, `prospectUserId` (FK unique opcional), `leadId` (FK unique, NOT NULL).
- `status` (`BrokerLeadStatus`: NEW → SIGNED_UP → QUALIFIED → CONTRACT_SIGNED, o LOST).
- Timestamps: `signedUpAt`, `qualifiedAt`, `contractSignedAt`. `expiresAt` igual que Referral.
- **Comisión variable** acordada offline entre MaxRent y broker. **Sin campos de monto en schema** — staff registra el pago como texto libre en `payoutNote` al procesar la transferencia (ej. `"Boleta hon. 2026-0123 - $850.000 - BCI 18-jun-2026"`).
- `payoutStatus`, `paidAt`, `payoutNote` mismo significado que en Referral.
- Coexiste con `BrokerInvestorInvite` (que es invitación explícita por token, no atribución por code compartible).
- Cuando el prospect crea cuenta, además del link a `BrokerLead.prospectUserId` se setea `User.sponsorBrokerUserId` para mantener consistencia con el modelo de sponsorship.

**Property + PropertyCatalogDraft** (inventario + staging)
- `Property`: `inventoryCode` y `houmPropertyId` como business keys únicas; `status` (AVAILABLE / RESERVED / SOLD / ARCHIVED), `visibleToBrokers`, `metadata` Json.
- `PropertyCatalogDraft`: filas de staging (CSV o sync Houm) hasta que staff aprueba la publicación. Ver `docs/HOUM_CATALOG_METADATA.md` y `docs/PROPERTY_INVENTORY_IMPORT.md`.

**Pool + PoolUnit** (Producto 2 — portafolio de propiedades arrendadas)
- Tablas independientes de `Property` para evitar bugs por queries cruzadas. Detalle full en `docs/POOL_PRODUCTO.md`.
- `Pool`: `slug` único, `capRateBruto` común a todas las unidades, `reservationFeeClp` (Mercado Pago), métricas agregadas cacheadas (`totalUnits`, `totalValueUf`, `totalMonthlyRentClp`, `occupancyPct`) recalculadas en cada import.
- `PoolUnit`: 1:N desde `Pool`, `externalId` = `Id` del Excel (único por pool para upsert idempotente). Precio se **deriva** (`monthlyRent × 12 / capRate`); `internalData` JSONB guarda dirección/depto/estado raw — sensible, no exponer al inversionista. `saleStatus` (AVAILABLE / RESERVED / SOLD).
- **`Reservation` soporta ambos productos**: `propertyId` ahora nullable + nuevo `poolUnitId`. CHECK constraint `reservations_target_xor_check` garantiza XOR (exactamente uno de los dos seteado).
- Import: `scripts/import-lab-pool.ts` con parser puro testeado en `src/lib/pool/lab-excel-parser.ts`. Soporta `--dry-run`; idempotente al re-correr.

**UfRate** (UF chilena cacheada por día)
- `date` (`@db.Date`, UNIQUE), `valueClp` (`Decimal(12,2)`), `source` (default `mindicador.cl`), `createdAt`.
- Un row por día. Cron diario `/api/cron/refresh-uf` hace upsert idempotente desde mindicador.cl.
- Los endpoints del portal (`/api/portal/pools`, `/pools/[slug]`, `/pool-units/[id]`) consultan `getLatestUfRate()` y devuelven el valor al cliente para mostrar `"≈ $X CLP"` debajo de los precios en UF.
- El portal NUNCA pega a mindicador en runtime de una request del usuario.
- Detalle full: [`docs/UF_RATE.md`](./docs/UF_RATE.md).

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
enum ReferralStatus             { PENDING, SIGNED_UP, QUALIFIED, SIGNED, EXPIRED }
enum BrokerLeadStatus           { NEW, SIGNED_UP, QUALIFIED, CONTRACT_SIGNED, LOST }
enum PayoutStatus               { PENDING, PAID }
enum PoolStatus                 { DRAFT, OPEN, CLOSED }
enum PoolUnitOcupacion          { ARRENDADO, VACANTE, POR_DESOCUPARSE, AVISO_SALIDA, AVISADO_PARA_DESOCUPAR, PUBLICADA }
enum PoolUnitSaleStatus         { AVAILABLE, RESERVED, SOLD }
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
| POST | `/api/public/leads` | No | Recibe el body del form del landing (inversionista, vendedor o broker). Upsert idempotente de `Lead` por email. Para `kind=INVESTOR` nuevo, dispara welcome email vía la capa de notifications. Acepta opcionalmente `referral_code` (ver atribución abajo). |
| GET | `/api/public/uf-rate` | No | UF chilena cacheada para el badge "1 UF = $X" del header de `www.maxrent.cl`. Cache HTTP 30 min (`s-maxage=1800`). Devuelve `{ uf: { date, valueClp, source } }` o `{ uf: null }` si todavía no hay cron corrido. Detalle: [`docs/UF_RATE.md`](./docs/UF_RATE.md). |

CORS: orígenes permitidos vía `LEADS_ALLOWED_ORIGINS` (CSV, compartido entre los dos endpoints públicos). Por defecto: `https://www.maxrent.cl` y `https://maxrent.cl`. En non-prod, también `*.vercel.app`.

**Atribución de referidos** (PR #47, captura — la creación de `Referral`/`BrokerLead` viene en PR siguiente):

- El landing setea cookie `mxr_ref` con el `?ref=` cuando alguien visita con un code válido (formato `INV-XXXXXX` o `BRK-XXXXXX`). TTL **60 días**, política **first-touch** (no se sobrescribe en visitas posteriores). Implementación en `lib/referralCookie.ts` del repo del landing.
- Los 3 forms (`FormInversionista`, `FormVendedor`, `FormBroker`) leen la cookie y mandan el code en el body como `referral_code`. Schema Zod `referralCodeFieldSchema` valida prefijo + cuerpo alfanumérico.
- El endpoint resuelve el code contra `User.investorReferralCode` o `User.brokerReferralCode`. Si matchea, persiste en `Lead.marketingAttribution.referralCode` + `referralKind`, y override de `Lead.source` a `"investor-referral"` o `"broker-referral"` (en lugar de `"landing-investor"`).
- **Códigos inválidos o sin match → ignorados silenciosamente.** El lead se crea igual sin atribución (no falla el form).
- **First-touch** garantizado en server: si el lead ya existe con `referralCode` previo en su `marketingAttribution`, NO se sobrescriben `source` ni `marketingAttribution` en el update (solo se refrescan firstName/lastName/phone/etc.).

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
| GET | `/api/reservations` | Sí | Listar reservas del usuario (Producto 1 + Producto 2 unificadas con `poolUnit` populated cuando aplica). |
| POST | `/api/reservations` | Sí | Crear nueva reserva. Acepta **XOR** `propertyId` (Producto 1) o `poolUnitId` (Producto 2). El refine de Zod rechaza body con ambos o con ninguno. Rate limit bucket «expensive» (5/min por usuario). |

### Pagos
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/payments/checkout` | Sí | Generar URL de checkout. Rate limit «expensive». Reconcilia ambos lados (Property + PoolUnit) al actualizar la reserva. |
| POST | `/api/payments/webhook` | No* | Webhook de confirmación de pago. Rate limit «webhook» (60/min por IP). |

*El webhook no usa auth de usuario pero debe validar firma de la pasarela.

### Pools (Producto 2 — Portafolios de propiedades)
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/portal/pools` | Sí | Listado de pools publicados (`OPEN`/`CLOSED`). Devuelve métricas agregadas + gate de reserva (`canReserve`, `reserveBlockReason`). |
| GET | `/api/portal/pools/[slug]` | Sí | Detalle del pool + unidades **públicas** (sin `internalData`). Marca por unidad si el inversionista ya tiene reserva activa. |
| GET | `/api/portal/pool-units/[id]` | Sí | Detalle de una unidad + summary del pool para la página de checkout `/reserva/pool-unit/[id]`. |

> **UF dinámica**: los 3 endpoints de pools devuelven además `latestUfRate: { date, valueClp } | null` con la UF más reciente cacheada (vía cron diario que pega a mindicador.cl). El cliente la usa para calcular `"≈ $X CLP"` debajo de los precios en UF. Si todavía no hay UF cacheada (post-deploy fresco), el campo es `null` y la UI omite el hint sin romper. Detalle: [`docs/UF_RATE.md`](./docs/UF_RATE.md).
| GET | `/api/staff/pools` | Staff | Listado para `/staff/pools` con métricas. |
| GET | `/api/staff/pools/[slug]` | Staff | Detalle con `internalData` (dirección exacta, depto) y reserva activa por unidad. |
| PATCH | `/api/staff/pools/[slug]` | Staff | Actualiza `description`, `status` (`DRAFT/OPEN/CLOSED`) y/o `acceptingReservations`. |

**Aislamiento de datos sensibles**: el campo `PoolUnit.internalData` (dirección, depto, raw del Excel) NO se expone nunca en endpoints de inversionista. Cada select público va por `POOL_UNIT_PUBLIC_SELECT` en `src/lib/services/pool.service.ts`. Si agregas un campo público nuevo, agregalo ahí explícitamente.

**Import**: el alta de un pool **no** se hace desde la UI — se corre `scripts/import-lab-pool.ts` (idempotente). Detalle en [`docs/POOL_PRODUCTO.md`](./docs/POOL_PRODUCTO.md).

### Endpoints reusados extendidos para Producto 2

- `POST /api/staff/reservations/[id]/cancel` — además de reconciliar `Property`, reconcilia `PoolUnit` si la reserva era pool (vuelve a `AVAILABLE` salvo `SOLD`).
- `POST /api/staff/reservations/[id]/escriturar` — además de transicionar la reserva a `CONFIRMED` y disparar payouts, si la reserva tiene `poolUnitId` pasa el unit a `SOLD` (terminal).

### Broker (autenticado, flujo `/broker/*`)
APIs bajo `/api/broker/*` para postulación, perfil, oportunidades visibles, invites a inversionistas, etc.

### AVLA — Verificación DICOM manual (Producto 3, interno staff)
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/staff/users/[userId]/avla-check` | Staff | Dispara un check de "preaprobación AVLA": login + buscar/crear deudor + solicitar línea de 1 UF + polling rápido + persiste fila en `AvlaCheck`. Requiere `Profile.rut` + `User.name`. Si AVLA env vars faltan → 503. Detalle: [`docs/AVLA.md`](./docs/AVLA.md). |

`GET /api/staff/investors` (ya existe) ahora incluye `avlaCheck` (último check, con `preapproved`, `state`, `stateTags`, `errorMessage`) y `hasProfileForAvla` (boolean) por cada inversionista.

### Staff (`SUPER_ADMIN` only)
APIs bajo `/api/staff/*` para inventario, aprobación de brokers, gestión de inversionistas, notas de evaluaciones, etc.

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/staff/reservations/[id]/escriturar` | Marca una reserva como `CONFIRMED` y dispara los payouts de atribución del usuario asociado: el `Referral` del referido pasa a `SIGNED` ($500.000 PENDING) y el `BrokerLead` del prospect pasa a `CONTRACT_SIGNED` (PENDING). Idempotente. Devuelve `{ reservationId, alreadyEscriturada, payouts: { referralId, brokerLeadId } }`. |
| POST | `/api/staff/reservations/[id]/cancel` | (Existente) Cancela una reserva activa y reconcilia inventario. |
| POST | `/api/staff/referrals/[id]/mark-paid` | Marca un `Referral` como pagado al referidor (transferencia bancaria realizada). Body: `{ note: string }`. Solo permitido si `status = SIGNED` y `payoutStatus = PENDING`. |
| POST | `/api/staff/broker-leads/[id]/mark-paid` | Marca un `BrokerLead` como pagado al broker. Body: `{ note: string }`. Solo permitido si `status = CONTRACT_SIGNED` y `payoutStatus = PENDING`. La nota DEBE incluir monto y referencia (la comisión es variable, no está en schema). |

### Cron jobs

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET/POST | `/api/cron/referrals/expire` | `Bearer <CRON_SECRET>` | Recorre `Referral` y `BrokerLead` con `expiresAt < now` y status no terminal, marca como `EXPIRED` / `LOST`. Configurado en `vercel.json` para correr diariamente a las 06:00 UTC. Si `CRON_SECRET` no está seteado → 503. |
| GET/POST | `/api/cron/db-backup` | `Bearer <CRON_SECRET>` | Backup diario de la DB a Vercel Blob (data-only en `.tar.gz` con un JSONL por tabla). Schedule `30 6 * * *` (06:30 UTC = 03:30 Chile). Retención 30 días con cleanup integrado en el mismo cron. Si `CRON_SECRET` o `BLOB_READ_WRITE_TOKEN` no están seteados → 503 defensivo. Detalle: `docs/BACKUP_RESTORE.md`. |
| GET/POST | `/api/cron/refresh-uf` | `Bearer <CRON_SECRET>` | Trae UF chilena desde mindicador.cl y la persiste idempotente en `UfRate` (cache diario). **No está en `vercel.json`** — la cuota Hobby permite 2 crons y ya están ocupados; se dispara manualmente vía `curl` hasta que pasemos a Pro. Detalle: `docs/UF_RATE.md`. |

**Importante para crons nuevos**: el middleware de NextAuth ahora **exime explícitamente `/api/cron/*`** del check de auth (igual que webhooks). Sin esa exención, Vercel Cron recibe 401 antes de llegar al handler que valida el Bearer. Si agregás un cron nuevo, ya está cubierto por el patrón existente — no requiere cambios al middleware.

---

## 6. FLUJOS TÉCNICOS DETALLADOS

### 6.0 Captura de Lead desde el landing
```
0. (Opcional) Visita previa con ?ref=INV-XXX o ?ref=BRK-XXX
   → MarketingAttributionCapture (cliente) llama captureFirstTouchReferralFromUrl()
   → Cookie `mxr_ref` con el code (60d, SameSite=Lax, Secure en prod, first-touch)
   → captureFirstTouchFromUrl() también guarda UTMs/referrer en sessionStorage

1. Inversionista llena el form en https://www.maxrent.cl
2. POST {PORTAL_URL}/api/public/leads (CORS permitido para www.maxrent.cl)
   Body incluye:
     - type, nombre, apellido, email, whatsapp (+ campos específicos por type)
     - marketing_attribution (UTMs/gclid/fbclid/referrer del sessionStorage)
     - referral_code (opcional, leído de la cookie mxr_ref)
   →
   a. Validación Zod (formato INV-/BRK- + alfanuméricos para referral_code).
   b. Si hay referral_code: resolveReferralCode() busca User.investorReferralCode
      o User.brokerReferralCode. Si matchea → atribución válida; si no → se
      ignora silenciosamente, lead se crea como orgánico.
   c. Lookup del Lead existente por email para decidir first-touch:
      - Si existe con referralCode previo → preservar source y attribution.
      - Caso contrario → usar los nuevos.
   d. Upsert Lead (idempotente, no degrada status):
      - source = "investor-referral" / "broker-referral" / "landing-*"
      - marketingAttribution.referralCode = "INV-XXX" / "BRK-XXX" si aplica
      - marketingAttribution.referralKind = "INVESTOR" / "BROKER"
   e. Si es Lead nuevo INVESTOR → welcome email vía notifyTemplate() (f&f).

3. Landing muestra pantalla "Recibimos tus datos" con CTA "Continuar al portal →"
4. Click → redirige a {PORTAL_URL}/login?email=...&newLead=1&callbackUrl=/perfil
5. /login del portal lee los query params:
   - Banner verde de bienvenida con el email del lead
   - Input de magic link pre-llenado
   - signIn de Google con login_hint para preseleccionar la cuenta (1 click)
```

Vendedor sigue el mismo POST pero NO entra al portal — staff lo contacta.

**Creación de `Referral`/`BrokerLead` post-upsert:**

Después de upsertear el Lead, si hubo `referralResolution` y NO se preservó atribución previa (caso first-touch repetido), el endpoint llama a `createReferralForLead` o `createBrokerLeadForLead` (ver `src/lib/services/referral.service.ts`). Idempotentes vía `upsert(where: { leadId })` — repetir el submit del form no duplica la fila. Errores se loguean pero NO rompen la respuesta del lead.

**Vista del referidor en el dashboard:**

`/dashboard` (portal inversionista) incluye la sección **`<ReferralsCard />`** que muestra:

- Header explícito de cómo funciona el programa: $500.000 cash al banco, 120 días desde signup para escriturar, sin tope.
- Link copiable `${LANDING_URL}/?ref=${code}` con botón "Copiar link" (componente cliente `ReferralCopyButton`).
- Totales acumulados (`Recibido` / `Pendiente de pago`) cuando aplica.
- Lista de referidos con:
  - Status humano: `Sin cuenta` (PENDING) / `Activo` (SIGNED_UP) / `Calificado` (QUALIFIED) / `Pago en curso` (SIGNED + PENDING) / `Pagado` (SIGNED + PAID) / `Vencido` (EXPIRED).
  - Días para vencer; si quedan ≤30 días → badge naranja con `⚠️`.

`NEXT_PUBLIC_LANDING_URL` (env opcional) permite apuntar a previews/staging; default `https://www.maxrent.cl`.

Lazy-fix: si el User no tiene `investorReferralCode` (cuentas pre-existentes al PR de generación), el dashboard llama a `ensureInvestorReferralCode` antes de renderizar.

**Vista interna del staff en `/staff/atribuciones`:**

Página interna con dos tabs (`?tab=referrals` / `?tab=broker-leads`). Cada tab renderiza:

- Stats agregados arriba (activos, calificados, escrituraron, pago pendiente, pagados, vencidos, totales en CLP para Referrals).
- Tabla con todas las filas (limit 200, ordenadas createdAt desc).
- Por cada fila: detalle del referidor/broker, code, prospect, status, payout, y acción "Marcar pagado" (componente cliente `<MarkPaidForm />`) cuando aplica.

`MarkPaidForm` es un patrón "click para expandir": primer click muestra textarea + botón Confirmar; submit hace POST al endpoint correspondiente y `router.refresh()` la página. Solo aparece cuando el registro está en `SIGNED`/`CONTRACT_SIGNED` con `payoutStatus = PENDING`.

Banner azul informativo en la tab BrokerLeads recordando que la nota DEBE incluir monto + referencia (la comisión no está en schema).

**Vista del broker en `/broker/referidos`:**

Página dedicada (item nuevo en el sidebar broker, `Share2` icon, label "Mis referidos"). Renderiza el componente **`<BrokerLeadsCard />`** que adapta la vista del referidor a las reglas comerciales:

- Header **NO menciona monto**. Solo refiere a "la comisión acordada" — la comisión es variable, definida offline entre MaxRent y cada broker.
- Link copiable con `BRK-XXXXXX` (mismo `ReferralCopyButton`, recibe URL ya armado y override de styles vía prop `className` para usar `bg-broker-navy`).
- **Stats funnel** visible (5 cards): `Lead capturado` (NEW) / `Creó cuenta` (SIGNED_UP) / `Calificado` (QUALIFIED) / `Escrituró` (CONTRACT_SIGNED — verde) / `Perdido` (LOST — gris). Si hay escrituras con `payoutStatus = PENDING` se muestra un banner naranja contando cuántas.
- Lista de prospects con countdown 120d, mismo patrón de warning ≤30d.
- Diferencia con `/broker/inversionistas`: esa página muestra cuentas YA inversionistas vinculadas por sponsorship (clientes en uso); `/broker/referidos` muestra el **pipeline comercial** (BrokerLeads en cualquier status). Las dos coexisten.

Lazy-fix análogo: si el broker no tiene `brokerReferralCode`, la page llama a `ensureBrokerReferralCode` antes de renderizar.

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
   e. ensureInvestorReferralCode: genera User.investorReferralCode
      (formato INV-XXXXXX) — todo User nace con su code de referidos
      listo para compartir, ya que canInvest=true es el default.
   f. linkUserToPendingAttribution: si existe Referral o BrokerLead
      con leadId del Lead vinculado (o email matching) en estado inicial:
        - Setea referredUserId / prospectUserId
        - Transiciona Referral.status PENDING → SIGNED_UP, signedUpAt=now
        - Actualiza expiresAt = signedUpAt + 120 días (ventana post-signup)
        - Para BrokerLead: además, si User.sponsorBrokerUserId está null,
          lo setea al brokerUserId del BrokerLead (consistencia con
          el modelo de sponsorship existente).
      Best-effort: si falla, NO rompe el alta. Job nocturno futuro (PR 6)
      reintenta el linking buscando Referrals/BrokerLeads con
      referredUserId/prospectUserId nulos.
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

### 6.3 Reserva + Pago (Producto 1 — Property)
```
1. Usuario en /oportunidades, selecciona propiedad → /reserva/propiedad/[id]
2. POST /api/reservations { propertyId } → crea Reservation con
   status=PENDING_PAYMENT, expiresAt=48h, propertyId=<id>, poolUnitId=null
3. markPropertyReservedForInvestorSync(tx, propertyId) marca Property como
   RESERVED + metadata.investorReservationId.
4. Usuario clickea "Pagar" → POST /api/payments/checkout con reservationId
5. paymentService.createCheckout():
   a. Crea preferencia de pago en Mercado Pago
   b. Guarda paymentExternalId y paymentUrl en la reserva
   c. Actualiza status a PAYMENT_PROCESSING
   d. Retorna checkoutUrl
6. Frontend redirige al checkout de Mercado Pago
7. Usuario paga en MP
8. MP envía webhook → POST /api/payments/webhook (rate limit "webhook" 60/min)
9. Verificar firma → obtener detalle del pago → paymentService.handleWebhook()
10. Si aprobado: status=PAID, guardar paymentMethod y paidAt; reconciliar
    Property + PoolUnit (el lado XOR que no aplica es no-op porque recibe null).
11. (Futuro) Enviar email de confirmación
```

### 6.3b Reserva + Pago (Producto 2 — PoolUnit)
```
1. Usuario en /oportunidades/pools/[slug], elige unidad AVAILABLE en la grilla
2. Click "Reservar" → /reserva/pool-unit/[id]?from=...
3. Página de checkout (GET /api/portal/pool-units/[id]) muestra resumen de la
   unidad + monto de reserva del pool.
4. Click "Confirmar y pagar" → POST /api/reservations { poolUnitId } (rate
   limit "expensive" 5/min por usuario).
5. Transacción Prisma:
   a. Valida pool.status === "OPEN", acceptingReservations, unit.saleStatus
      === "AVAILABLE", no haya otra reserva activa, no haya duplicado del
      propio usuario.
   b. Crea Reservation con propertyId=null, poolUnitId=<id>,
      amount=pool.reservationFeeClp, status=PENDING_PAYMENT, expiresAt=48h.
   c. markPoolUnitReservedSync(tx, poolUnitId) marca PoolUnit.saleStatus =
      RESERVED.
6. CHECK constraint XOR de Postgres garantiza propertyId IS NULL XOR
   poolUnitId IS NULL.
7. Frontend dispara POST /api/payments/checkout → mismo flujo que Producto 1.
8. Webhook MP → handleWebhook → reconcile de ambos lados (Property y PoolUnit).
   En este caso el reconcile de Property es no-op (propertyId=null);
   reconcilePoolUnitAfterReservationChange mantiene saleStatus=RESERVED
   mientras la reserva está activa.
9. Si reserva CANCELLED/EXPIRED → reconcile devuelve unit a AVAILABLE (salvo
   que ya esté SOLD, que es terminal).
10. Staff escritura (ver 6.4) → unit pasa a SOLD (terminal por esa vía).
```

### 6.4 Escrituración + Trigger de payouts de atribución
```
1. Reserva del inversionista llega a status=PAID (pago confirmado)
2. Llega el momento de escriturar la propiedad. Staff verifica condiciones
   y dispara manualmente:
   POST /api/staff/reservations/[id]/escriturar
3. Endpoint:
   a. Verifica session staff SUPER_ADMIN.
   b. Marca Reservation.status = CONFIRMED (si no estaba ya).
   c. Si reservation.poolUnitId !== null → marca PoolUnit.saleStatus = SOLD
      (terminal; no se revierte por canc/expiry posterior). Producto 1 no
      requiere paso adicional — Property.status sigue siendo RESERVED hasta
      que staff la mueva manualmente.
   d. Llama triggerEscrituraPayouts(reservation.userId):
      • Busca Referral con referredUserId = userId; si está en PENDING /
        SIGNED_UP / QUALIFIED → transiciona a SIGNED, signedAt = now,
        payoutStatus = PENDING. Idempotente.
      • Busca BrokerLead con prospectUserId = userId; si está en NEW /
        SIGNED_UP / QUALIFIED → transiciona a CONTRACT_SIGNED,
        contractSignedAt = now, payoutStatus = PENDING.
   d. Devuelve { reservationId, alreadyEscriturada, payouts: { referralId,
      brokerLeadId } }.
4. Resultado:
   - El referidor (en /dashboard) ve su referido como "Pago en curso".
   - El broker (en /broker/referidos) ve su prospect como "Pago pendiente".
   - Staff entra a /staff/atribuciones y ve la fila con badge "Pendiente" +
     botón "Marcar pagado" → abre textarea para registrar el detalle de la
     transferencia (banco, referencia, fecha) y confirma.
5. Staff procesa la transferencia POR FUERA del sistema (la app NO ejecuta
   pagos). Vuelve a /staff/atribuciones, click "Marcar pagado":
   POST /api/staff/referrals/[id]/mark-paid    (peer)
   POST /api/staff/broker-leads/[id]/mark-paid (broker)
   Body: { note: "Transferencia BCI ref 12345 - 15-may-2026" }
   → payoutStatus = PAID, paidAt = now, payoutNote registrada.
6. El referidor / broker ve actualizado el estado a "Pagado" en su portal.
```

### 6.5 Job nocturno: expiración de atribuciones
```
Vercel Cron (config en maxrent-portal/vercel.json):
  schedule: "0 6 * * *"  (06:00 UTC = ~02:00–03:00 Chile)
  path: /api/cron/referrals/expire

1. Vercel envía request con header Authorization: Bearer <CRON_SECRET>.
2. Endpoint valida secret. Si no setea CRON_SECRET → 503 (defensivo).
3. expireOverdueAttributions() corre dos updateMany() en transacción:
   • Referral con expiresAt < now y status IN (PENDING, SIGNED_UP,
     QUALIFIED) → status = EXPIRED.
   • BrokerLead con expiresAt < now y status IN (NEW, SIGNED_UP,
     QUALIFIED) → status = LOST.
4. Devuelve { ok, referralsExpired, brokerLeadsLost, ranAt }.

Idempotente: las filas ya en estado terminal están excluidas del WHERE.
```

### 6.6 Job nocturno: backup de la DB a Vercel Blob
```
Vercel Cron (config en maxrent-portal/vercel.json):
  schedule: "30 6 * * *"  (06:30 UTC = ~03:30 Chile)
  path: /api/cron/db-backup

1. Vercel envía request con header Authorization: Bearer <CRON_SECRET>.
2. Endpoint defensivo: si falta CRON_SECRET o BLOB_READ_WRITE_TOKEN → 503.
3. buildDatabaseDump() arma el dump en memoria:
   a. Lista tablas user-owned via pg_catalog, excluye _prisma_migrations
      (se reconstruye con `prisma migrate deploy` al restaurar).
   b. Por cada tabla: SELECT * → JSONL (1 fila = 1 línea JSON). BigInt
      serializado como string para evitar pérdida.
   c. Empaqueta en .tar.gz USTAR con metadata.json (startedAt,
      schemaVersion = última migration aplicada, totalRows, tables).
4. put() a Vercel Blob privado:
   - path: db-backups/YYYY-MM-DD.tar.gz
   - access: "private" (solo SDK + token, no URL pública)
   - allowOverwrite: true (re-corridas manuales del mismo día sobrescriben)
5. Cleanup integrado: list() blobs con prefijo db-backups/ y borra los que
   tienen uploadedAt > 30 días.
6. Devuelve métricas: blobUrl, sizeBytes, totalRows, tables[], deleted[].

Restore (NUNCA contra prod directo):
  • Crear Neon branch desde un momento antes del incidente.
  • prisma migrate deploy contra el branch.
  • scripts/restore-from-backup.ts --tarball X --target-url <branch> [--block-prod-host Y]
  • Confirmar visualmente con Prisma Studio.
  • Promover branch a primary o copiar selectivamente (ver docs/BACKUP_RESTORE.md).

Defensa en profundidad:
  • Neon PITR (24h en plan Free).
  • Vercel Blob (30 días, este job).
  • Git + prisma migrations (schema histórico).
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

### 8.1b AVLA — Preaprobación DICOM (manual desde staff) — OPERATIVO
- **Estado**: integración viva en producción desde 2026-05-15. NO es el mismo producto que Floid — AVLA es "seguro de crédito" y MaxRent piggyback sobre la **póliza de Houm** para usar la decisión automática de AVLA como proxy de capacidad/riesgo.
- **Caso de uso**: staff aprieta botón "Verificar DICOM" en `/staff/inversionistas`. NO se le muestra al inversionista. NO se dispara automáticamente.
- **Definición "preaprobado"**: AVLA no devolvió `rejectedState`/`automaticallyRejectedState` en los `stateTags`. Cualquier otro estado (reestudio, activa, en evaluación) cuenta como preaprobado para MaxRent.
- **Latencia**: ~10-15s end-to-end (login + listar póliza + buscar/crear deudor + solicitar línea de 1 UF + 2 polls de 5s + logout).
- **Archivo**: `src/lib/services/avla.service.ts` (logic) + `POST /api/staff/users/[id]/avla-check` (endpoint) + columna en `staff-investors.tsx` (UI).
- **Variables**: `AVLA_BASE_URL`, `AVLA_COMPANY`, `AVLA_USER` (base64), `AVLA_PASSWORD` (base64), `AVLA_APP_NAME` — credenciales son **de Houm**, no de MaxRent.
- **Solo prod**: AVLA no nos dio sandbox. Cada check crea una línea real (de 1 UF) en los libros de Houm. Detalle full: [`docs/AVLA.md`](./docs/AVLA.md).

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

### 8.5 Vercel KV (Upstash Redis) — OPERATIVO
- **Estado**: integración Upstash activa en Vercel desde 2026-05-13. DB Redis en región **iad1** (Washington, us-east-1), plan Free, linkeada a `maxrent-portal` en Production + Preview + Development.
- **Propósito**: storage compartido para rate limiting entre instancias serverless. Sliding window contra Redis con latencia ~5ms.
- **Variables inyectadas automáticamente por Vercel** (custom prefix `KV`):
  - `KV_REST_API_URL`
  - `KV_REST_API_TOKEN`
  - `KV_REST_API_READ_ONLY_TOKEN`
  - `KV_URL`
  - `KV_REDIS_URL`
- **Usado por**: `src/lib/rate-limit-core.ts` (cliente Upstash + 4 buckets) y `src/lib/rate-limit.ts` (wrapper con NextAuth para route handlers).
- **Modo dev local sin KV**: fail-open silencioso (no bloquea, loguea un warn al primer hit). Si querés testear el comportamiento real en local, copia las dos env vars a `.env.local`.
- **Detalle**: ver sección «Rate limiting» más abajo y [`docs/RATE_LIMIT.md`](./docs/RATE_LIMIT.md).

### 8.7b mindicador.cl (UF chilena) — OPERATIVO
- **Estado**: integración via cron diario que pega a `https://mindicador.cl/api/uf`. Activa desde 2026-05-15.
- **Propósito**: cachear el valor de la UF en la tabla `uf_rates` (un row por día). El portal usa el último valor cacheado para mostrar `"≈ $X CLP"` debajo de los precios en UF de los pools (Producto 2). **El portal nunca pega a mindicador en runtime de una request del usuario.**
- **Sin API key**: mindicador.cl es público y sin auth.
- **Endpoint cron**: `/api/cron/refresh-uf` (manual por ahora, ver Cron jobs en § 5).
- **Modo dev local sin UF cacheada**: los endpoints del portal devuelven `latestUfRate: null` y la UI omite el hint en CLP silenciosamente. Para tener data en local: correr el cron manual contra local o copiar un row a mano.
- **Detalle**: [`docs/UF_RATE.md`](./docs/UF_RATE.md).

### 8.7 Vercel Blob — OPERATIVO
- **Estado**: integración Upstash-like activa en Vercel desde 2026-05-14 (parte del marketplace Vercel Storage). Store `maxrent-portal-backups` en región **iad1**, plan Free, modo **Private** (no público).
- **Propósito**: storage offsite para backups diarios de la DB. Defensa contra el límite de PITR de Neon Free (24h) y contra compromiso del propio Neon.
- **Variable inyectada automáticamente por Vercel**: `BLOB_READ_WRITE_TOKEN` (custom prefix `BLOB`).
- **Usado por**: `/api/cron/db-backup` con `@vercel/blob` SDK. Calls clave: `put()` (subir con `access: "private"`), `list()` (paginar blobs para cleanup), `del()` (borrar blobs antiguos).
- **Sobre `access: "private"`**: feature de Vercel Blob 2025+. Stores privados solo son accesibles con SDK + token; NO via URL pública. Si el código pide `access: "public"` contra un store privado, Vercel devuelve error de runtime — patrón importante para futuros usos del Blob.
- **Modo dev local sin Blob**: el endpoint `/api/cron/db-backup` devuelve 503 defensivo (`BLOB_READ_WRITE_TOKEN no configurado`). No rompe nada.
- **Detalle**: ver sección «Backup + Restore» más abajo y [`docs/BACKUP_RESTORE.md`](./docs/BACKUP_RESTORE.md).

---

## 8.6 Rate limiting (seguridad transversal)

Capa de defensa en profundidad contra abuso. **No reemplaza** otras protecciones (firma de webhooks, auth, gates de negocio): se suma en cada endpoint sensible.

**Storage**: Vercel KV (ver § 8.5).

**4 buckets nombrados** definidos en `src/lib/rate-limit-core.ts → RATE_LIMITS`:

| Bucket | Límite | Identificación | Endpoints |
|---|---|---|---|
| `webhook` | 60/min por IP | IP del cliente | `/api/payments/webhook`, `/api/floid/callback`, `/api/notifications/webhook/resend` |
| `public` | 10/min por IP | IP del cliente | `/api/public/leads`, `/api/public/uf-rate` |
| `authenticated` | 60/min por usuario | userId si hay sesión, sino IP | `/api/portal/pools` + `[slug]`, `/api/portal/pool-units/[id]`, `/api/portal/catalog-properties` |
| `expensive` | 5/min por usuario | userId si hay sesión, sino IP | `/api/floid/evaluate`, `POST /api/reservations`, `POST /api/payments/checkout` |

**Respuesta cuando se excede**: `HTTP 429` con headers `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` + body `{ error, retryAfter }`. CORS preservado donde aplica.

**Arquitectura del módulo** (2 archivos):
- `rate-limit-core.ts`: lógica pura sin Next/NextAuth (testeable con vitest).
- `rate-limit.ts`: wrapper con `auth()` + `NextResponse`. Importa NextAuth solo aquí.

**Cómo aplicar a un endpoint nuevo**:
```ts
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limited = await applyRateLimit(req, RATE_LIMITS.public, { route: "mi-endpoint" });
  if (limited) return limited;
  // … resto del handler
}
```

Tests: `src/lib/rate-limit.test.ts` cubre extracción de IP, fail-open sin KV, configuración de buckets (12 cases).

Detalle completo + verificación con curl: [`docs/RATE_LIMIT.md`](./docs/RATE_LIMIT.md).

---

## 8.8 Backup + Restore (defensa en profundidad de datos)

Tres capas independientes para garantizar recuperación de datos ante distintos tipos de incidente:

| Capa | Cobertura | Granularidad | Provee |
|---|---|---|---|
| **Neon PITR** (Free) | últimas 24h | segundo | restore via Neon Console (1 click) |
| **Vercel Blob `db-backups/`** | últimos 30 días | día (UTC) | restore via `scripts/restore-from-backup.ts` |
| **Git + Prisma migrations** | siempre | commit | schema histórico completo |

Por qué tres capas:
- **PITR 24h** cubre la mayoría de incidentes (descubiertos rápido).
- **Blob 30 días** cierra el gap entre día 2 y día 30 que PITR Free no cubre.
- **Git** garantiza que el schema se puede reconstruir incluso si se pierden las 2 capas anteriores.

### Backup automático
Cron diario a 06:30 UTC (`/api/cron/db-backup`) genera `.tar.gz` con:
- Un `.jsonl` por tabla user-owned (data only — schema viene de Prisma migrations).
- `metadata.json` con `schemaVersion` (última migration aplicada) para sanity check al restaurar.

Detalle del flujo: § 6.6. Detalle del runbook de restore: [`docs/BACKUP_RESTORE.md`](./docs/BACKUP_RESTORE.md).

### Patrones aprendidos durante la implementación
Cicatrices que dejaron lecciones para futuros endpoints similares:

1. **Webhooks/crons necesitan exención explícita en el middleware** (mismo patrón que `/api/payments/webhook`, `/api/floid/callback`, `/api/notifications/webhook/*`). Sin esa exención el middleware de NextAuth corta con 401 antes de llegar al handler.
2. **Logging defensivo de env vars** al inicio de endpoints que dependen de integraciones (`console.log({cronSecret, blobToken, databaseUrl})` con booleanos true/false). Vercel runtime logs muestran solo status codes, no bodies — sin esto el diagnóstico se vuelve adivinanza.
3. **Vercel Blob ahora soporta stores privados** (`access: "private"`). Pedir `public` contra un store privado falla con error de runtime claro. Default sugerido: `private` salvo que sea contenido para servir vía URL pública.

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
