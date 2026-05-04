# MaxRent · Marketing

App Next.js para el sitio interno de **recursos de marca** en `marketing.maxrent.cl`.

## Qué hace
- Sitio gated (Google sign-in + allowlist de emails) para distribuir logos, piezas de campaña, fotografía y material de prensa.
- Sin BD propia: la autorización vive 100% en la env var `MARKETING_ALLOWED_EMAILS`.
- Los archivos NO se sirven desde `/public` — viven en `private/recursos/<categoria>/` y se sirven via `/api/recursos/...` para que el allowlist también proteja descargas directas.

## Requisitos
- Node 20+
- `.env.local` con las vars de `.env.example` completadas (ver §Setup)

## Setup local
```bash
cd maxrent-marketing
npm install
cp .env.example .env.local
# completar GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET, MARKETING_ALLOWED_EMAILS
npm run dev   # → http://localhost:3003
```

## Stack
- Next.js 14.2 · App Router · `src/`
- NextAuth v5 beta (Google provider, JWT session)
- Tailwind 3 · DM Sans + DM Serif Display (idéntico al portal)
- Sin Prisma, sin BD

## Estructura
```
maxrent-marketing/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx
│  │  ├─ page.tsx                 # home con grid de categorías
│  │  ├─ signin/                  # /signin (público)
│  │  ├─ categoria/[slug]/        # /categoria/<slug>
│  │  └─ api/
│  │     ├─ auth/[...nextauth]/   # NextAuth handlers
│  │     └─ recursos/[...path]/   # download endpoint gated
│  ├─ components/SiteHeader.tsx
│  ├─ lib/
│  │  ├─ auth.config.ts           # Edge-safe (importa middleware)
│  │  ├─ auth.ts                  # Node runtime (provider Google)
│  │  └─ recursos.ts              # manifest + scan de disco
│  └─ middleware.ts               # protege todo salvo /signin
└─ private/recursos/              # archivos por categoría (no servidos por public/)
   ├─ logos/
   ├─ piezas-feed/
   ├─ piezas-pagadas/
   ├─ fotos/
   └─ prensa/
```

## Agregar acceso a un email
Editar la env var `MARKETING_ALLOWED_EMAILS` en Vercel (o `.env.local` en dev). Es CSV o separado por espacios. Ejemplo:
```
MARKETING_ALLOWED_EMAILS=nk@houm.com,rodrigo@maxrent.cl,chama@houm.com
```
Cambiar la env var en Vercel dispara redeploy automático (~30 s).

Si la lista está vacía o no definida, **nadie entra** (cerrado por defecto, por diseño).

## Agregar archivos a una categoría
Drop el archivo en `private/recursos/<slug>/`, commit + push. Ver [`private/recursos/README.md`](private/recursos/README.md).

## Agregar una categoría nueva
1. Sumar entrada en `src/lib/recursos.ts` (`CATEGORIES`).
2. Crear `private/recursos/<slug>/`.
3. Commit + push.

## Deploy (Vercel)
Proyecto Vercel separado (no comparte con landing ni portal). Ver `SETUP.md` en la raíz del repo (sección Marketing).

Variables de entorno que necesita el proyecto en Vercel:
- `NEXTAUTH_URL=https://marketing.maxrent.cl`
- `NEXTAUTH_SECRET` (32 bytes random)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `MARKETING_ALLOWED_EMAILS`

DNS: CNAME `marketing.maxrent.cl` → `cname.vercel-dns.com`.

Google OAuth: agregar `https://marketing.maxrent.cl/api/auth/callback/google` a Authorized redirect URIs.
