# Base de datos — MaxRent Portal

> **Mantenimiento:** al cambiar `prisma/schema.prisma` (o el modelo de datos), actualiza este archivo en el mismo cambio. Convención del proyecto: [`.cursor/rules/database-documentation.mdc`](../.cursor/rules/database-documentation.mdc).

Diagrama entidad–relación del schema Prisma ([`prisma/schema.prisma`](../prisma/schema.prisma)).

**Cómo verlo:** abre este archivo en VS Code con una extensión Mermaid, en GitHub/GitLab, o en [Mermaid Live Editor](https://mermaid.live).

## Diagrama ER

```mermaid
erDiagram
  User ||--o| Profile : has
  User ||--o| BrokerProfile : has
  User ||--o{ Account : has
  User ||--o{ Session : has
  User ||--o| Lead : leadId
  User ||--o{ CreditEvaluation : has
  User ||--o{ Reservation : has
  User ||--o{ Notification : has
  User ||--o{ BrokerInvestorInvite : "broker sends"
  User ||--o{ BrokerInvestorInvite : "investor consumes"
  User }o--o| User : "sponsorBrokerUserId"
  User ||--o{ Referral : "refers (referrer)"
  User ||--o| Referral : "is referred (referred)"
  User ||--o{ BrokerLead : "trae (broker)"
  User ||--o| BrokerLead : "es traido (prospect)"
  Lead ||--o| Referral : "atribuye (peer)"
  Lead ||--o| BrokerLead : "atribuye (broker)"
  CreditEvaluation ||--o{ Reservation : optional
  Property ||--o| PropertyCatalogDraft : "promoted from"

  Lead {
    string id PK
    string email UK
    enum kind
    enum status
    string firstName
    string lastName
    string name
    string phone
    string cantidadPropiedades
    string arrendadas
    string adminHoum
    string source
    json marketingAttribution
    json data
    datetime createdAt
    datetime updatedAt
  }

  User {
    string id PK
    string email UK
    string name
    string image
    datetime emailVerified
    boolean canInvest
    enum staffRole
    datetime createdAt
    datetime updatedAt
    string leadId FK
    enum brokerAccessStatus
    datetime brokerReviewedAt
    string investorReferralCode UK
    string brokerReferralCode UK
  }

  Profile {
    string id PK
    string userId FK UK
    string firstName
    string lastName
    string contactEmail UK
    string rut UK
    string phone
    string address
    string commune
    string city
    boolean onboardingCompleted
    json additionalData
    datetime createdAt
    datetime updatedAt
  }

  BrokerProfile {
    string userId PK_FK
    string companyName
    string jobTitle
    boolean isIndependent
    string websiteUrl
    string linkedinUrl
    text pitch
    datetime createdAt
    datetime updatedAt
  }

  Account {
    string id PK
    string userId FK
    string type
    string provider
    string providerAccountId
    text refresh_token
    text access_token
  }

  Session {
    string id PK
    string sessionToken UK
    string userId FK
    datetime expires
  }

  VerificationToken {
    string identifier
    string token UK
    datetime expires
  }

  CreditEvaluation {
    string id PK
    string userId FK
    enum status
    int score
    enum riskLevel
    decimal maxApprovedAmount
    text summary
    json rawResponse
    text errorMessage
    datetime requestedAt
    datetime completedAt
    datetime consentAt
    string consentVersion
    string floidCaseId
  }

  Reservation {
    string id PK
    string userId FK
    string evaluationId FK
    string propertyId
    string propertyName
    enum status
    decimal amount
    string currency
    string paymentExternalId
    datetime paidAt
    json metadata
    datetime createdAt
    datetime updatedAt
  }

  Property {
    string id PK
    string title
    enum status
    boolean visibleToBrokers
    json metadata
    string inventoryCode UK
    string houmPropertyId UK
    datetime createdAt
    datetime updatedAt
  }

  PropertyCatalogDraft {
    string id PK
    enum source
    string houmPropertyId UK
    string inventoryCode UK
    string title
    json metadata
    enum status
    enum pendingPropertyStatus
    boolean pendingVisibleToBrokers
    string propertyId FK UK
    datetime reviewedAt
    string reviewedByUserId
    text rejectionReason
  }

  BrokerInvestorInvite {
    string id PK
    string token UK
    string brokerUserId FK
    string inviteeEmail
    enum status
    string registeredUserId FK
    datetime createdAt
    datetime expiresAt
    datetime completedAt
  }

  Notification {
    string id PK
    enum channel
    string templateKey
    string recipient
    string userId FK
    json variables
    enum status
    string provider
    string providerMessageId
    json providerResponse
    text errorMessage
    datetime scheduledAt
    datetime sentAt
    datetime deliveredAt
    datetime openedAt
    datetime createdAt
    datetime updatedAt
  }

  Referral {
    string id PK
    string code
    string referrerUserId FK
    string referredEmail
    string referredUserId FK UK
    string leadId FK UK
    enum status
    datetime signedUpAt
    datetime qualifiedAt
    datetime signedAt
    datetime expiresAt
    int rewardCLP
    enum payoutStatus
    datetime paidAt
    text payoutNote
    datetime createdAt
    datetime updatedAt
  }

  BrokerLead {
    string id PK
    string code
    string brokerUserId FK
    string prospectEmail
    string prospectUserId FK UK
    string leadId FK UK
    enum status
    datetime signedUpAt
    datetime qualifiedAt
    datetime contractSignedAt
    datetime expiresAt
    enum payoutStatus
    datetime paidAt
    text payoutNote
    datetime createdAt
    datetime updatedAt
  }
```

## Notas

- **Usuarios:** una sola tabla `users`. Las capacidades no son excluyentes: **`canInvest`** habilita el flujo inversionista (`/(portal)/*`); **`staffRole`** controla acceso interno (`/staff/*`, APIs `/api/staff/*`); **`brokerAccessStatus`** indica si la cuenta solicitó/aprobó acceso broker (`null` = nunca solicitó). Un mismo email puede ser inversionista, broker aprobado y staff al mismo tiempo.
- **BrokerProfile (`broker_profiles`):** ficha comercial 1:1 con `User` (distinta de `profiles` inversionista). Datos mínimos para postular (`companyName`, `jobTitle`, `isIndependent`, URLs opcionales, `pitch`). `POST /api/broker/apply` exige perfil completo antes de pasar a `PENDING`. Edición vía `PATCH /api/broker/profile` solo con `brokerAccessStatus` null o `REJECTED`.
- **Staff:** login en **`/staff/login`** (URL interna; no enlazar desde marketing). Tras otorgar `staffRole = SUPER_ADMIN` en BD, el usuario usa `/staff` para inventario y aprobación de brokers. Las rutas **`/admin/*`** redirigen a **`/staff/*`** (compatibilidad).
- **Leads:** tabla `leads` con shape extendido para recibir el form del landing (inversionista o vendedor).
  - `kind` (`LeadKind`: INVESTOR / SELLER) discrimina qué flujo aplica.
  - `status` (`LeadStatus`: NEW → INVITED → REGISTERED → CONVERTED, o DISCARDED) marca el avance en el funnel.
  - `firstName` / `lastName` / `phone` son snapshot del form (se usan para pre-rellenar `Profile` en onboarding).
  - `cantidadPropiedades` / `arrendadas` / `adminHoum` solo se llenan para `kind = SELLER`.
  - `marketingAttribution` (UTMs, gclid, referrer, captured_at) propaga al `Profile.additionalData.marketingAttribution` en alta para BI.
  - `data` queda como bolsa flexible para flujos futuros sin migrar.
  - Capturado vía `POST /api/public/leads` (endpoint público sin auth, llamado por el landing).
- **Notifications:** tabla `notifications` — audit trail de toda comunicación saliente (welcome, magic link, futuras transaccionales). Toda comunicación pasa por la capa propia `lib/services/notifications` que registra QUEUED → SENT → DELIVERED/OPENED/BOUNCED via webhook del proveedor. `userId` es opcional (null cuando se envía a un Lead sin cuenta aún; el `backfillUserNotifications` del evento `createUser` los asocia después). Cambiar de proveedor (Resend → Postmark/SES/etc.) es 1 env var, sin tocar negocio. Decisión arquitectónica: `memory/project_notifications_infra.md`.
- **BrokerInvestorInvite:** invitación single-use de un broker aprobado a un inversionista. URL pública `/i/[token]`, claim setea `User.sponsorBrokerUserId`. `User.brokerInvestorInvitesSent` / `brokerInvestorInvitesConsumed` son los lados de la relación.
- **Sponsor broker:** `User.sponsorBrokerUserId` referencia al broker aprobado al que un inversionista queda asociado (vía claim de invite o asignación staff). Self-relation: el mismo modelo `User` tiene `sponsoredInvestors`.
- **Propiedades:** tabla `properties` (inventario). `inventoryCode` y `houmPropertyId` son business keys únicas para upserts desde CSV o sync con Houm. `Reservation.propertyId` es **texto** (no FK formal a `Property`; puede alinearse a futuro).
- **PropertyCatalogDraft:** staging de propiedades antes de que staff las publique al catálogo definitivo. `source` discrimina HOUM vs CSV. Al aprobar, se crea/actualiza la `Property` correspondiente y `propertyId` queda apuntando a ella.
- **VerificationToken:** modelo NextAuth; no referencia `User` por FK.
- **CreditEvaluation:** `consentAt` / `consentVersion` registran el consentimiento explícito antes de llamar a Floid; `floidCaseId` guarda el identificador de caso Floid cuando aplica (p. ej. flujo asíncrono); `downloadPdfUrl` apunta al reporte completo del widget; `staffNotes` permite anotaciones internas no visibles al inversionista. Con `status = COMPLETED`, staff puede fijar o anular `staffReservationApprovedAt` vía APIs `approve-reservation` / `revoke-reservation-approval` (portal `/staff/inversionistas`).
- **MarketingAccess:** allowlist de correos autorizados a entrar a `marketing.maxrent.cl`. La marketing app comparte esta Neon pero NO usa Prisma client — sólo lee/escribe esta tabla con `@neondatabase/serverless`. El portal no consume la tabla; existe acá porque el portal es dueño de las migraciones del schema. Super-admins (los que pueden agregar/quitar emails desde la UI `/admin` de marketing) viven en la env `MARKETING_SUPER_ADMINS` del proyecto Vercel de marketing — NO en BD para evitar bootstrap problem.

## Atribución de referidos

El portal trackea dos canales de atribución por separado: **peer-to-peer** entre inversionistas (`Referral`) y **comercial** vía broker (`BrokerLead`). Las dos tablas son intencionalmente paralelas en estructura física pero independientes en semántica de negocio.

### Codes en `User`

Cada cuenta tiene hasta dos codes únicos que sirven como identificador para `?ref=<code>` en links compartibles:

| Campo | Prefijo | Cuándo se genera | Hook |
|---|---|---|---|
| `User.investorReferralCode` | `INV-` | Al crear cuenta (todo User nace con `canInvest=true` por default). | `events.createUser` en `lib/auth.ts` y rama Credentials del provider dev → `ensureInvestorReferralCode()`. |
| `User.brokerReferralCode` | `BRK-` | Al pasar a `brokerAccessStatus = APPROVED`. | `approveBroker()` en `services/broker.service.ts` → `ensureBrokerReferralCode()`. |

Generación: 6 caracteres alfanuméricos uppercase del charset `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (sin `0/O/1/I/L` para legibilidad). ~887M combinaciones. Verificación de unicidad por lookup en la columna correspondiente; reintenta hasta 8 veces antes de tirar error.

**Idempotencia**: `ensureInvestorReferralCode` / `ensureBrokerReferralCode` son no-ops si el code ya existe. Llamarlos dos veces no genera codes nuevos.

**Tolerancia a fallas**: ambos hooks corren bajo `safeRunReferralHook()` que loguea pero no propaga errores — la atribución es feature lateral, NO bloqueamos el alta o la aprobación si Prisma falla. Para regenerar codes faltantes (por error transitorio), basta con que el inversionista entre a su dashboard o staff re-apruebe al broker.

Multi-rol: una cuenta que es inversionista **y** broker aprobado tiene **ambos codes**. El sistema sabe por qué canal entró un referido leyendo el prefijo del code usado: `INV-` → `Referral`; `BRK-` → `BrokerLead`. Cero ambigüedad.

### Tabla `Referral` (peer-to-peer)

Se crea cuando un inversionista (referidor) comparte su `INV-` y otra persona (referido) llega al landing con `?ref=INV-XXXX` y llena el form. **El flujo siempre crea `Lead` primero**; el `Referral` se crea en el mismo paso con `leadId` apuntando al lead (no nullable — sin excepciones en v1).

- **Reward fijo: $500.000 CLP** (`rewardCLP = 500000`, columna por si en el futuro se hacen campañas con montos distintos).
- **Pago en cash al referidor** cuando el referido escritura una propiedad del Club. Se transfiere a la cuenta bancaria del referidor — la captura de datos bancarios queda fuera de v1 (staff la pide por mail al momento del payout).
- **Sin tope de referidos por usuario en v1.** Si alguien refiere a 10 personas que escrituran, recibe $5.000.000 CLP. Monitoreo manual; agregar tope es 1 línea si vemos abuso.
- **El beneficio es siempre del referidor, nunca del referido.** El referido NO recibe descuento ni nada — entra en condiciones idénticas a cualquier otro inversionista.

### Tabla `BrokerLead` (comercial)

Se crea cuando un broker aprobado comparte su `BRK-` y un prospect llega con `?ref=BRK-XXXX` y llena el form. Mismo flujo: Lead siempre primero, `leadId` NOT NULL.

- **Comisión variable.** El monto se acuerda offline entre MaxRent y cada broker (puede ser % del ticket, fee fijo, escalonado por volumen, etc.). **No hay campos de monto en schema** — staff registra el pago como texto libre en `payoutNote` al procesar la transferencia. Ej: `"Boleta hon. 2026-0123 - $850.000 - Transferencia BCI 18-jun-2026"`.
- **Pago al momento de la escritura** del prospect (transición a `CONTRACT_SIGNED`).
- **Coexiste con `BrokerInvestorInvite`.** El invite es flujo de invitación explícita por token único; el `BrokerLead` es atribución por code compartible. Un mismo broker puede usar los dos canales.
- **Sponsorship**: cuando el prospect crea cuenta, además de linkearse al `BrokerLead` se setea `User.sponsorBrokerUserId = brokerUserId` para mantener consistencia con el modelo de sponsorship pre-existente.

### Atribución first-touch con cookie de 60 días

Política aplicada uniformemente a los dos canales:

1. Primer visit con `?ref=<code>` en el landing → cookie `mxr_ref` con el code, válida por **60 días**. Implementación: `lib/referralCookie.ts` del repo del landing (componente `<MarketingAttributionCapture />` lo invoca en mount).
2. Visits posteriores con otro `?ref=` → **se ignoran** en cliente (la cookie tiene política first-touch).
3. Cookie expirada sin conversión → libre para atribución nueva.
4. Si el lead ya tiene `marketingAttribution.referralCode` y se reenvía el form con otro code → **no se sobrescribe en server**. El endpoint `/api/public/leads` hace lookup previo y omite los campos `source` + `marketingAttribution` del update si ya hay atribución previa (defensa en profundidad por si el cliente cambia la cookie manualmente).
5. **Códigos con formato OK pero que no matchean ningún `User.investorReferralCode` ni `User.brokerReferralCode`** → se ignoran silenciosamente. El lead se crea sin atribución (como orgánico). No falla el form.

### Forma de la atribución persistida en `Lead.marketingAttribution`

Cuando hay atribución resuelta, el JSON queda con esta forma (acumulativo con los UTMs ya capturados):

```json
{
  "utm_source": "instagram",
  "utm_medium": "story",
  "referrer": "https://www.instagram.com/...",
  "landing_path": "/",
  "captured_at": "2026-05-04T22:31:11.000Z",
  "referralCode": "INV-AB12CD",
  "referralKind": "INVESTOR"
}
```

Y `Lead.source` se setea a `"investor-referral"` o `"broker-referral"` (sobreescribiendo el `"landing-*"` default).

### Estados (`status`) y expiración (`expiresAt`)

Ambas tablas usan **un solo campo** `expiresAt` que se reinterpreta según el status actual:

| Status | Significado | `expiresAt` referido a |
|---|---|---|
| `PENDING` (Referral) / `NEW` (BrokerLead) | Lead capturado, sin cuenta del portal todavía | `createdAt + 60 días` (espera de signup) |
| `SIGNED_UP` | Referido/prospect creó cuenta | `signedUpAt + 120 días` (espera de escrituración) |
| `QUALIFIED` | Referido/prospect pasó `canInvest = true` | Mismo `signedUpAt + 120 días` |
| `SIGNED` (Referral) / `CONTRACT_SIGNED` (BrokerLead) | Escrituró → gatilla payout | (ya no expira) |
| `EXPIRED` (Referral) / `LOST` (BrokerLead) | Pasó `expiresAt` sin escriturar | (terminal — payout nunca aplica) |

Job nocturno marca como `EXPIRED`/`LOST` cualquier registro con `now > expiresAt` y status no terminal.

**UX explícita en los portales:** la regla de 120 días post-signup se comunica claramente al referidor y al broker en sus respectivos dashboards, con countdown visible por cada referral y warning visual cuando faltan menos de 30 días. Esto evita reclamos del estilo "pero yo lo referí hace 5 meses".

### Por qué dos tablas separadas y no una sola con discriminator

Decisión arquitectónica explícita. Pros y contras evaluados:

- ✗ Tabla única `Referral` con `referrerKind = INVESTOR | BROKER`: tentadora por DRY, pero los campos divergen rápido. Inversionista tiene reward fijo conocido; broker tiene fee variable, factura/boleta, comisiones escalonadas. Mantener una tabla habría requerido columnas nullables (la mitad solo aplica a un kind), filtros condicionales en cada query (olvidar `WHERE referrerKind = X` mezcla dominios), y la palabra "referral" miente para el broker (es su pipeline comercial, no un referido).
- ✓ Dos tablas separadas: cada dominio evoluciona en sus propios términos, permisos naturales (broker no ve referrals peer; inversionista no ve broker leads), reportería simple sin filtros condicionales, fiscal/contable distinto.

El costo es mínimo: para reportería staff unificada se hace `UNION` cuando se necesita, sin downtime ni migración futura.

### Flujo end-to-end (ejemplo Referral)

```
1. Pedro crea cuenta → events.createUser → ensureInvestorReferralCode
   → User.investorReferralCode = "INV-AB12CD"
2. Pedro comparte: https://www.maxrent.cl/?ref=INV-AB12CD
3. Juan visita el landing → captureFirstTouchReferralFromUrl
   → cookie mxr_ref="INV-AB12CD" (60 días, first-touch)
4. Juan llena el form → POST /api/public/leads
   ├─ resolveReferralCode("INV-AB12CD") → encuentra User Pedro
   ├─ Upsert Lead (Juan): source = "investor-referral",
   │                      marketingAttribution.referralCode = "INV-AB12CD",
   │                      marketingAttribution.referralKind = "INVESTOR"
   └─ createReferralForLead({ leadId, code, referrerUserId: Pedro.id,
                               referredEmail: juan@... })
        → Referral nuevo: status = PENDING,
                          expiresAt = createdAt + 60 días
5. Juan recibe magic link → NextAuth crea User
   ├─ events.createUser:
   │  ├─ Vincula Lead (User.leadId = Juan.lead.id)
   │  ├─ ensureInvestorReferralCode → Juan también tiene su propio INV-
   │  └─ linkUserToPendingAttribution:
   │       → Referral.status PENDING → SIGNED_UP, signedUpAt = ahora,
   │         referredUserId = Juan.user.id,
   │         expiresAt = signedUpAt + 120 días
6. Staff escritura la reserva de Juan:
   POST /api/staff/reservations/[id]/escriturar
   ├─ Reservation.status → CONFIRMED
   └─ triggerEscrituraPayouts(juan.user.id):
        → Referral.status SIGNED_UP/QUALIFIED → SIGNED, signedAt = ahora,
          payoutStatus = PENDING (toca pagar a Pedro)
7. Staff procesa transferencia en /staff/atribuciones (PR 7 futuro)
   → Referral: payoutStatus → PAID, paidAt = ahora,
               payoutNote = "Transferencia BCI 12345 - 15-may-2026"
```

**Job nocturno de expiración** (Vercel Cron `0 6 * * *` UTC, configurado en `maxrent-portal/vercel.json`):

```
GET /api/cron/referrals/expire
  Authorization: Bearer <CRON_SECRET>

→ expireOverdueAttributions() corre dos updateMany en transacción:
   - Referral con expiresAt < now y status IN (PENDING, SIGNED_UP, QUALIFIED)
     → status = EXPIRED
   - BrokerLead con expiresAt < now y status IN (NEW, SIGNED_UP, QUALIFIED)
     → status = LOST

Filas ya terminales (SIGNED, EXPIRED, CONTRACT_SIGNED, LOST) excluidas del WHERE.
```

Para `BrokerLead` el flujo es idéntico cambiando `INV-` por `BRK-` y `SIGNED` por `CONTRACT_SIGNED`. El monto en `payoutNote` lo decide staff caso a caso (comisión variable acordada offline).

Adicionalmente, en el paso 5 `linkUserToPendingAttribution` setea `User.sponsorBrokerUserId = brokerUserId` para mantener consistencia con el sistema de sponsorship existente (solo si el campo está null — no pisa atribuciones manuales de staff o vía `BrokerInvestorInvite`).

## Enums (resumen)

| Enum | Valores |
|------|---------|
| `StaffRole` | NONE, SUPER_ADMIN |
| `BrokerAccessStatus` | PENDING, APPROVED, REJECTED |
| `BrokerInvestorInviteStatus` | PENDING, COMPLETED, EXPIRED |
| `LeadKind` | INVESTOR, SELLER, BROKER |
| `LeadStatus` | NEW, INVITED, REGISTERED, CONVERTED, DISCARDED |
| `PropertyStatus` | AVAILABLE, RESERVED, SOLD, ARCHIVED |
| `CatalogDraftSource` | HOUM, CSV |
| `PropertyCatalogDraftStatus` | PENDING, REJECTED, APPROVED |
| `EvaluationStatus` | PENDING, PROCESSING, COMPLETED, FAILED, EXPIRED |
| `RiskLevel` | LOW, MEDIUM, HIGH |
| `ReservationStatus` | PENDING_PAYMENT, PAYMENT_PROCESSING, PAID, CONFIRMED, CANCELLED, EXPIRED, REFUNDED |
| `NotificationChannel` | EMAIL, SMS, WHATSAPP, PUSH |
| `NotificationStatus` | QUEUED, SENT, DELIVERED, OPENED, BOUNCED, COMPLAINED, FAILED |
| `ReferralStatus` | PENDING, SIGNED_UP, QUALIFIED, SIGNED, EXPIRED |
| `BrokerLeadStatus` | NEW, SIGNED_UP, QUALIFIED, CONTRACT_SIGNED, LOST |
| `PayoutStatus` | PENDING, PAID |
