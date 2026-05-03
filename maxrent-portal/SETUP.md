# MaxRent Portal — Guía de Setup

## Requisitos previos

- Node.js 18+
- PostgreSQL (local o Neon)
- Cuenta de Google Cloud (para OAuth)
- Cuenta de Resend (para magic links)

## Desarrollo sin Google ni Resend

Si `NODE_ENV` no es `production` y no definiste `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` ni `RESEND_API_KEY`, el login muestra **“Entrar (desarrollo)”**: ingresas un email y se crea el usuario en tu base local (útil para probar onboarding y el portal sin credenciales externas). No uses este modo en producción.

## 1. Instalar dependencias

```bash
cd maxrent-portal
npm install
```

## 2. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Completar las variables en `.env.local`:

### NEXTAUTH_SECRET / AUTH_SECRET

```bash
openssl rand -base64 32
```

Definí al menos una de **`NEXTAUTH_SECRET`** o **`AUTH_SECRET`** en `.env.local` (mismo valor). El código sincroniza ambas en runtime para que el middleware (Edge) no falle con `MissingSecret`. En **producción** el deploy debe incluir ese valor (el `next build` en CI puede usar un placeholder interno solo durante la compilación).

### Google OAuth

1. Ir a [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Crear proyecto (o usar existente)
3. Crear credencial → **OAuth 2.0 Client ID** → **Web Application**
4. Agregar URI de redirección: `http://localhost:3002/api/auth/callback/google`
5. Copiar Client ID y Client Secret al `.env.local`

### Base de datos

Mantené **`DATABASE_URL` idéntica** en `maxrent-portal/.env` y `maxrent-portal/.env.local` si usás las dos. Si ves el aviso de diferencia (a veces por espacios o query distinta), ejecutá **`npm run env:align-db`**: copia la URL efectiva (merge, prioridad `.env.local`) dentro de **`.env`** para que coincida con lo que usan `npm run db:*` y el Prisma CLI suelto.

**Opción A — Neon (recomendado para producción):**
1. Crear cuenta en [neon.tech](https://neon.tech)
2. Crear proyecto → copiar connection string

**Opción B — Local:**
```bash
createdb maxrent_portal
# DATABASE_URL=postgresql://localhost:5432/maxrent_portal
```

### Resend (infraestructura de comunicaciones)

Toda comunicación saliente del portal (welcome, magic link, recordatorios futuros) pasa por la capa propia `src/lib/services/notifications` y queda registrada en la tabla `Notification` para audit trail. Resend es el primer adapter; el provider se cambia con una env var sin tocar código de negocio. Decisión arquitectónica completa: [`memory/project_notifications_infra.md`](../../.claude/projects/-Users-nk-0--Proyectos-maxcap/memory/project_notifications_infra.md) y [README de la capa](./src/lib/services/notifications/README.md).

1. Crear cuenta en [resend.com](https://resend.com).
2. **Domains → Add Domain → `maxrent.cl`** → seguir el setup manual de DNS (DKIM TXT en `resend._domainkey`, SPF MX/TXT en `send`, DMARC TXT en `_dmarc`). Verificar.
3. **API Keys → Create API Key** con permiso _Sending access_ y dominio `maxrent.cl`. Copiar la key (se muestra una sola vez).
4. **Webhooks → Add Endpoint**:
   - URL: `https://portal.maxrent.cl/api/notifications/webhook/resend`
   - Eventos: todos los `email.*` (sent, delivered, bounced, complained, opened, clicked, delivery_delayed).
   - Copiar el _Signing Secret_.
5. Setear en `.env.local` (y en Production de Vercel) las cuatro vars:
   ```
   EMAIL_PROVIDER=resend                          # opcional, default ya es resend
   RESEND_API_KEY=re_...                          # paso 3
   EMAIL_FROM=MaxRent <hola@maxrent.cl>           # remitente visible
   RESEND_WEBHOOK_SECRET=whsec_...                # paso 4
   ```

Sin `RESEND_API_KEY` el adapter falla y la notificación queda en `Notification` con `status=FAILED` (el flujo de negocio sigue funcionando, solo no llega el email). Sin `RESEND_WEBHOOK_SECRET` el endpoint del webhook rechaza con 401 — es necesario para ver `status` evolucionar de SENT → DELIVERED/OPENED/etc.

### Floid (evaluación crediticia)

1. Obtener en el [dashboard Floid](https://dashboard.floid.io) el **token API**, **URL base** (sandbox vs prod), **ruta del producto** y si el flujo es **async** (callback).
2. Copiar variables a `.env.local` según [docs/FLOID_SETUP.md](./docs/FLOID_SETUP.md) y [`.env.example`](./.env.example) (`FLOID_API_KEY`, `FLOID_SERVICE_PATH`, `FLOID_USE_STUB=false`, etc.).
3. Probar el flujo en **`/evaluacion`** con un usuario que tenga RUT y perfil completo; revisar `CreditEvaluation` en la base.

## 3. Inicializar base de datos

Los comandos `db:push`, `db:migrate`, `db:studio` y **`db:seed`** fusionan **`maxrent-portal/.env`** y **`maxrent-portal/.env.local`** para `DATABASE_URL` (igual que en desarrollo con Next). El CLI crudo **`npx prisma db push`** solo lee `.env`, por eso puede fallar con `P1010` si `DATABASE_URL` está solo en `.env.local` — usá siempre **`npm run db:push`**.

```bash
# Generar cliente Prisma
npm run db:generate

# Aplicar schema a la base de datos
npm run db:push
# Si Prisma avisa de posible pérdida de datos en un cambio destructivo:
npm run db:push:force

# (Opcional) Lead demo + 10 propiedades inventario en borrador (Staff → Propiedades; no publicadas al broker)
npm run db:seed

# (Opcional) Abrir Prisma Studio para ver datos
npm run db:studio
```

### Staff, brokers e inventario

- **Staff (interno)**: opción A — SQL o Prisma Studio: `UPDATE users SET "staffRole" = 'SUPER_ADMIN' WHERE email = 'tu@email.com';`. Opción B — variable **`STAFF_SUPER_ADMIN_EMAILS`** en `.env.local` (emails separados por coma o espacio): el JWT otorga acceso staff sin cambiar la fila en BD (útil en dev). Entra por **`/staff/login`**; el panel está en **`/staff`**. **`/admin`** redirige a **`/staff`**.
- **Brokers**: landing pública `/brokers`; flujo autenticado bajo `/broker/*`. Tras aprobar un broker en staff, el usuario puede refrescar la sesión con **`session.update()`** o cerrar sesión y volver a entrar para ver `brokerAccessStatus` actualizado en el JWT.
- **Migraciones**: en dev podés usar `db:push` para iterar rápido, o `db:migrate` para crear archivos en `prisma/migrations`. **En producción se aplican automáticamente**: el `build` de Vercel corre `prisma migrate deploy && next build`, así que cualquier migración nueva entra al deploy de `main`. No requiere paso manual.
- **Inventario legacy (reserva broker directa):** versiones anteriores podían dejar `Property` en `RESERVED` con `metadata.brokerReservedByUserId` sin `Reservation` activa. Ese flujo ya no existe: pasá esas filas a `AVAILABLE` desde **Staff → Propiedades** (`PATCH /api/staff/properties/:id`) para limpiar metadata, o ejecutá un script SQL equivalente en cada entorno.

## 4. Ejecutar en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3002](http://localhost:3002) (el portal usa el puerto **3002** para no chocar con la app Next en la raíz del repo, que suele usar **3000**).

## 5. Deploy a Vercel

```bash
# Instalar Vercel CLI (si no la tienes)
npm i -g vercel

# Deploy
vercel

# Configurar variables de entorno en Vercel Dashboard
# IMPORTANTE: Actualizar NEXTAUTH_URL con la URL de producción
# IMPORTANTE: Agregar URI de redirección de Google OAuth para producción
```

## Estructura del proyecto

```
src/
├── app/
│   ├── (auth)/login/                 → Página de login (Google + magic link)
│   ├── (portal)/                     → Rutas protegidas del portal inversionista
│   │   ├── dashboard/                → Vista principal
│   │   ├── perfil/                   → Completar/editar datos (pre-rellenado con Lead)
│   │   ├── evaluacion/               → Evaluación crediticia (Floid widget)
│   │   └── reserva/                  → Gestión de reservas
│   ├── broker/                       → Portal broker (apply, oportunidades, perfil, etc.)
│   ├── staff/                        → Panel interno (SUPER_ADMIN)
│   ├── i/[token]/                    → Claim de invite broker→inversionista
│   ├── api/
│   │   ├── auth/                     → NextAuth endpoints (automático)
│   │   ├── public/leads/             → POST público desde el landing (lead capture)
│   │   ├── notifications/webhook/    → Webhook delivery tracking (Resend)
│   │   ├── floid/                    → Evaluación crediticia (Floid + callback)
│   │   ├── payments/                 → Checkout + webhooks
│   │   ├── reservations/             → CRUD reservas
│   │   ├── users/                    → Perfil de usuario
│   │   ├── broker/                   → APIs del flujo broker
│   │   └── staff/                    → APIs del panel interno
│   ├── layout.tsx                    → Root layout
│   └── page.tsx                      → Landing pública del portal
├── components/
│   ├── portal/                       → Sidebar, opportunities, journey, etc.
│   ├── broker/                       → Componentes del flujo broker
│   ├── staff/                        → Componentes del panel interno
│   └── floid/                        → Reporte Floid (summary + detail)
├── lib/
│   ├── auth.ts                       → NextAuth Node runtime (providers + events)
│   ├── auth.config.ts                → NextAuth Edge-safe (callbacks JWT/session)
│   ├── prisma.ts                     → Cliente Prisma (singleton)
│   ├── validations.ts                → Schemas Zod (incluye leadPublicBodySchema)
│   └── services/
│       ├── notifications/            → Capa vendor-agnostic de comunicaciones
│       │   ├── index.ts              → notify(), notifyTemplate(), backfill
│       │   ├── types.ts              → EmailProvider, NotifyInput, etc.
│       │   ├── providers/            → Adapters (email-resend.ts, _registry.ts)
│       │   ├── templates/            → react-email (welcome-investor, magic-link)
│       │   ├── delivery-tracker.ts   → Update de status desde webhook
│       │   └── README.md
│       ├── floid.service.ts          → Integración Floid
│       └── payment.service.ts        → [STUB] Integración pasarela
└── middleware.ts                     → Protección de rutas + redirect onboarding
```

## Próximos pasos

1. **Floid en sandbox/prod**: variables de entorno y pruebas según [docs/FLOID_SETUP.md](./docs/FLOID_SETUP.md) (el servicio ya soporta API real y webhook cuando están configurados).
2. **Integrar pasarela de pago**: reemplazar stub en `lib/services/payment.service.ts` (Mercado Pago Checkout Pro previsto en `CONTEXTO-PROYECTO.md`).
3. **Conectar catálogo de propiedades**: ver `docs/HOUM_CATALOG_METADATA.md` y `docs/PROPERTY_INVENTORY_IMPORT.md`.
4. **Más templates de email**: agregar reservación confirmada, evaluación lista, recibos. Ver [README de notifications](./src/lib/services/notifications/README.md) para sumar templates al registry.
