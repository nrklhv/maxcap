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

### Resend (emails)

1. Crear cuenta en [resend.com](https://resend.com)
2. Generar API key → copiar al `.env.local`
3. (Producción) Verificar dominio para emails desde @maxrent.cl

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
- **Migraciones**: si usas `db:push` en dev, el schema queda aplicado. En producción conviene `npx prisma migrate deploy` cuando integres la carpeta `prisma/migrations`.
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
│   ├── (auth)/login/       → Página de login (Google + magic link)
│   ├── (portal)/           → Rutas protegidas del portal
│   │   ├── dashboard/      → Vista principal
│   │   ├── perfil/         → Completar/editar datos
│   │   ├── evaluacion/     → Evaluación crediticia
│   │   └── reserva/        → Gestión de reservas
│   ├── api/
│   │   ├── auth/           → NextAuth endpoints (automático)
│   │   ├── floid/          → Evaluación crediticia (Floid + callback)
│   │   ├── payments/       → Checkout + webhooks
│   │   ├── reservations/   → CRUD reservas
│   │   └── users/          → Perfil de usuario
│   ├── layout.tsx          → Root layout
│   └── page.tsx            → Landing page
├── components/
│   ├── portal/sidebar.tsx  → Sidebar de navegación
│   └── ui/                 → Componentes reutilizables
├── lib/
│   ├── auth.ts             → Configuración NextAuth.js
│   ├── prisma.ts           → Cliente Prisma (singleton)
│   ├── validations.ts      → Schemas Zod
│   └── services/
│       ├── floid.service.ts    → Integración Floid (stub sin API key; real con env, ver docs/FLOID_SETUP.md)
│       └── payment.service.ts  → [STUB] Integración pasarela
└── middleware.ts           → Protección de rutas + redirect onboarding
```

## Próximos pasos

1. **Floid en sandbox/prod**: variables de entorno y pruebas según [docs/FLOID_SETUP.md](./docs/FLOID_SETUP.md) (el servicio ya soporta API real y webhook cuando están configurados).
2. **Integrar pasarela de pago**: Reemplazar stub en `lib/services/payment.service.ts`
3. **Conectar catálogo de propiedades**: Agregar modelo Property o conectar con API existente
4. **Emails transaccionales**: Configurar templates con Resend
5. **Panel staff**: Rutas `/staff` + APIs `/api/staff/*` (solo `staffRole = SUPER_ADMIN`)
