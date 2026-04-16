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

### NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

### Google OAuth

1. Ir a [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Crear proyecto (o usar existente)
3. Crear credencial → **OAuth 2.0 Client ID** → **Web Application**
4. Agregar URI de redirección: `http://localhost:3001/api/auth/callback/google`
5. Copiar Client ID y Client Secret al `.env.local`

### Base de datos

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

## 3. Inicializar base de datos

```bash
# Generar cliente Prisma
npm run db:generate

# Aplicar schema a la base de datos
npm run db:push

# (Opcional) Datos demo de leads
npm run db:seed

# (Opcional) Abrir Prisma Studio para ver datos
npm run db:studio
```

### Staff, brokers e inventario

- **Staff (interno)**: opción A — SQL o Prisma Studio: `UPDATE users SET "staffRole" = 'SUPER_ADMIN' WHERE email = 'tu@email.com';`. Opción B — variable **`STAFF_SUPER_ADMIN_EMAILS`** en `.env.local` (emails separados por coma o espacio): el JWT otorga acceso staff sin cambiar la fila en BD (útil en dev). Entra por **`/staff/login`**; el panel está en **`/staff`**. **`/admin`** redirige a **`/staff`**.
- **Brokers**: landing pública `/brokers`; flujo autenticado bajo `/broker/*`. Tras aprobar un broker en staff, el usuario puede refrescar la sesión con **`session.update()`** o cerrar sesión y volver a entrar para ver `brokerAccessStatus` actualizado en el JWT.
- **Migraciones**: si usas `db:push` en dev, el schema queda aplicado. En producción conviene `npx prisma migrate deploy` cuando integres la carpeta `prisma/migrations`.

## 4. Ejecutar en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3001](http://localhost:3001) (el portal usa el puerto **3001** para no chocar con la app Next en la raíz del repo, que suele usar **3000**).

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
│   │   ├── floid/          → Evaluación crediticia
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
│       ├── floid.service.ts    → [STUB] Integración Floid
│       └── payment.service.ts  → [STUB] Integración pasarela
└── middleware.ts           → Protección de rutas + redirect onboarding
```

## Próximos pasos

1. **Integrar Floid**: Reemplazar stub en `lib/services/floid.service.ts`
2. **Integrar pasarela de pago**: Reemplazar stub en `lib/services/payment.service.ts`
3. **Conectar catálogo de propiedades**: Agregar modelo Property o conectar con API existente
4. **Emails transaccionales**: Configurar templates con Resend
5. **Panel staff**: Rutas `/staff` + APIs `/api/staff/*` (solo `staffRole = SUPER_ADMIN`)
