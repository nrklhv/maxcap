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

## Enums (resumen)

| Enum | Valores |
|------|---------|
| `StaffRole` | NONE, SUPER_ADMIN |
| `BrokerAccessStatus` | PENDING, APPROVED, REJECTED |
| `BrokerInvestorInviteStatus` | PENDING, COMPLETED, EXPIRED |
| `LeadKind` | INVESTOR, SELLER |
| `LeadStatus` | NEW, INVITED, REGISTERED, CONVERTED, DISCARDED |
| `PropertyStatus` | AVAILABLE, RESERVED, SOLD, ARCHIVED |
| `CatalogDraftSource` | HOUM, CSV |
| `PropertyCatalogDraftStatus` | PENDING, REJECTED, APPROVED |
| `EvaluationStatus` | PENDING, PROCESSING, COMPLETED, FAILED, EXPIRED |
| `RiskLevel` | LOW, MEDIUM, HIGH |
| `ReservationStatus` | PENDING_PAYMENT, PAYMENT_PROCESSING, PAID, CONFIRMED, CANCELLED, EXPIRED, REFUNDED |
| `NotificationChannel` | EMAIL, SMS, WHATSAPP, PUSH |
| `NotificationStatus` | QUEUED, SENT, DELIVERED, OPENED, BOUNCED, COMPLAINED, FAILED |
