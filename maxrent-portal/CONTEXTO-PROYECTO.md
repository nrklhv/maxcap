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
 ├── 1:N CreditEvaluation (historial de evaluaciones Floid)
 ├── 1:N Reservation (reservas de propiedades)
 └── 1:1 Lead (vinculación con lead existente, opcional)
```

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

**Lead** (modelo simplificado de leads existentes)
- `id`, `email` (unique), `name`, `phone`, `source`, `status`, `data` (Json)
- Relación 1:1 con User (cuando el lead se registra en el portal)

### 3.3 Enums
```typescript
enum StaffRole         { NONE, SUPER_ADMIN }
enum BrokerAccessStatus { PENDING, APPROVED, REJECTED }
enum EvaluationStatus { PENDING, PROCESSING, COMPLETED, FAILED, EXPIRED }
enum RiskLevel        { LOW, MEDIUM, HIGH }
enum ReservationStatus { PENDING_PAYMENT, PAYMENT_PROCESSING, PAID, CONFIRMED, CANCELLED, EXPIRED, REFUNDED }
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
│   │   ├── portal/sidebar.tsx  ← Sidebar navegación (responsive)
│   │   ├── ui/                 ← Componentes reutilizables (por crear)
│   │   └── auth/               ← Componentes de auth (si se necesitan)
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

### Perfil de usuario
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/users/profile` | Sí | Obtener perfil del usuario logueado |
| PUT | `/api/users/profile` | Sí | Actualizar perfil + completar onboarding |

### Evaluación crediticia (Floid)
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/floid/evaluate` | Sí | Solicitar nueva evaluación |
| GET | `/api/floid/evaluations` | Sí | Listar evaluaciones del usuario |

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

---

## 6. FLUJOS TÉCNICOS DETALLADOS

### 6.1 Registro + Onboarding
```
1. Usuario llega a /login
2. Elige Google OAuth o ingresa email para magic link
3. NextAuth maneja el flujo completo
4. Al crear usuario (evento createUser):
   a. Se crea Profile vacío con onboardingCompleted=false
   b. Se busca Lead existente con mismo email → si existe, se vincula
5. Middleware detecta onboardingCompleted=false → redirige a /perfil
6. Usuario completa formulario (RUT, teléfono) → PUT /api/users/profile
7. API valida con Zod, verifica RUT único, actualiza profile
8. Se marca onboardingCompleted=true → se actualiza sesión JWT
9. Redirige a /dashboard
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
Ruta pública:       /, /login                      → Siempre accesible
API auth:           /api/auth/*                     → Siempre accesible (NextAuth)
Webhook pago:       /api/payments/webhook           → Siempre accesible (validar firma)
Ruta protegida:     Todo lo demás                   → Requiere auth

Si NO logueado + ruta protegida → Redirect a /login?callbackUrl=...
Si logueado + /login            → Redirect a /dashboard
Si logueado + !onboarding       → Redirect a /perfil (excepto /perfil y /api)
```

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

### 8.3 Resend (emails) — PARCIAL
- **Estado**: Configurado como provider de NextAuth (magic links funcionan)
- **Qué falta**: Templates de email transaccional (confirmación de registro, evaluación, pago)
- **Variables**: `RESEND_API_KEY`, `EMAIL_FROM`

### 8.4 Sistema de leads existente — PARCIAL
- **Estado**: Modelo Lead simplificado en schema, vinculación automática por email
- **Qué falta**: Ajustar modelo Lead al schema real del otro proyecto, decidir si comparten BD

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

### Fase 1 — Fundamento (AHORA)
- [x] Estructura del proyecto
- [x] Prisma schema completo
- [x] Auth (Google + magic link)
- [x] Middleware de protección
- [x] Pages: login, dashboard, perfil, evaluación, reserva
- [x] API routes funcionales
- [x] Services con stubs
- [ ] `npm install` + levantar en local
- [ ] Probar flujo completo con datos simulados
- [ ] Crear componentes UI reutilizables (Button, Input, Card, Badge)
- [ ] Deploy inicial a Vercel

### Fase 2 — Integraciones
- [ ] Integrar Floid API real (cuando tengan la doc)
- [ ] Integrar Mercado Pago Checkout Pro
- [ ] Configurar webhook de MP
- [ ] Emails transaccionales con Resend

### Fase 3 — Gestión
- [ ] Panel staff (`/staff`, `/staff/login`) — inventario, aprobación brokers (super admin)
- [ ] Conectar con catálogo de propiedades (modelo Property o API existente)
- [ ] Conectar con sistema de leads existente (sincronizar o compartir BD)

### Fase 4 — Producción
- [ ] Tests (vitest + testing-library)
- [ ] Rate limiting en API routes
- [ ] Logging y error tracking (Sentry)
- [ ] Monitoring (Vercel Analytics)
- [ ] Dominio propio (portal.maxrent.cl)
