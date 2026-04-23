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
  CreditEvaluation ||--o{ Reservation : optional

  Lead {
    string id PK
    string email UK
    string name
    string phone
    string source
    string status
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
    datetime createdAt
    datetime updatedAt
  }
```

## Notas

- **Usuarios:** una sola tabla `users`. Las capacidades no son excluyentes: **`canInvest`** habilita el flujo inversionista (`/(portal)/*`); **`staffRole`** controla acceso interno (`/staff/*`, APIs `/api/staff/*`); **`brokerAccessStatus`** indica si la cuenta solicitó/aprobó acceso broker (`null` = nunca solicitó). Un mismo email puede ser inversionista, broker aprobado y staff al mismo tiempo.
- **BrokerProfile (`broker_profiles`):** ficha comercial 1:1 con `User` (distinta de `profiles` inversionista). Datos mínimos para postular (`companyName`, `jobTitle`, `isIndependent`, URLs opcionales, `pitch`). `POST /api/broker/apply` exige perfil completo antes de pasar a `PENDING`. Edición vía `PATCH /api/broker/profile` solo con `brokerAccessStatus` null o `REJECTED`.
- **Staff:** login en **`/staff/login`** (URL interna; no enlazar desde marketing). Tras otorgar `staffRole = SUPER_ADMIN` en BD, el usuario usa `/staff` para inventario y aprobación de brokers. Las rutas **`/admin/*`** redirigen a **`/staff/*`** (compatibilidad).
- **Leads:** tabla `leads`; un `User` puede enlazarse con `leadId` cuando el lead se registra.
- **Propiedades:** tabla `properties` (inventario). `Reservation.propertyId` es **texto** en el schema actual; no hay FK formal a `Property` (puede alinearse en el futuro).
- **VerificationToken:** modelo NextAuth; no referencia `User` por FK.
- **CreditEvaluation:** `consentAt` / `consentVersion` registran el consentimiento explícito antes de llamar a Floid; `floidCaseId` guarda el identificador de caso Floid cuando aplica (p. ej. flujo asíncrono). Con `status = COMPLETED`, staff puede fijar o anular `staffReservationApprovedAt` vía APIs `approve-reservation` / `revoke-reservation-approval` (portal `/staff/inversionistas`).

## Enums (resumen)

| Enum | Valores |
|------|---------|
| `StaffRole` | NONE, SUPER_ADMIN |
| `BrokerAccessStatus` | PENDING, APPROVED, REJECTED |
| `PropertyStatus` | AVAILABLE, RESERVED, SOLD, ARCHIVED |
| `EvaluationStatus` | PENDING, PROCESSING, COMPLETED, FAILED, EXPIRED |
| `RiskLevel` | LOW, MEDIUM, HIGH |
| `ReservationStatus` | PENDING_PAYMENT, PAYMENT_PROCESSING, PAID, CONFIRMED, CANCELLED, EXPIRED, REFUNDED |
