# MaxRent · Marketing

App Next.js para el sitio interno de **recursos de marca** en `marketing.maxrent.cl`.

## Qué hace
- Sitio gated (Google sign-in + allowlist de emails) para distribuir logos, piezas de campaña, fotografía y material de prensa.
- Sin BD propia — comparte la **Neon del portal** vía `@neondatabase/serverless` y solo lee/escribe la tabla `marketing_access` (allowlist de correos).
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

Para generar `NEXTAUTH_SECRET` localmente:
```bash
openssl rand -base64 32
```

## Stack
- Next.js 14.2 · App Router · `src/`
- NextAuth v5 beta (Google provider, JWT session)
- Tailwind 3 · DM Sans + DM Serif Display (idéntico al portal)
- `@neondatabase/serverless` (HTTP-based, Edge-safe) — reusa la Neon del portal · sin Prisma client en este app

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

## Setup de Google OAuth (primera vez)

Estas credenciales se crean **una sola vez** y se reusan para local + producción.

1. Entrar a [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Seleccionar el mismo proyecto que ya usa el portal de MaxRent.
3. **+ CREATE CREDENTIALS** → **OAuth client ID** → Application type: **Web application**.
4. **Name**: `MaxRent Marketing`.
5. **Authorized JavaScript origins**:
   - `http://localhost:3003`
   - `https://marketing.maxrent.cl`
6. **Authorized redirect URIs**:
   - `http://localhost:3003/api/auth/callback/google`
   - `https://marketing.maxrent.cl/api/auth/callback/google`
7. **CREATE** → copiar el Client ID y Client Secret.
8. Pegar los valores en:
   - `.env.local` (para dev local)
   - Variables de entorno del proyecto Vercel (Settings → Environment Variables, scope **Production**, **Preview** y **Development**)

### Si necesitas agregar un dominio nuevo (preview, staging, etc.)
Editar el mismo OAuth client en Google Cloud Console y sumar el origin + redirect URI a las listas. Sin esto, Google rechaza el callback con `redirect_uri_mismatch`.

## Agregar acceso a un email

### Opción A — desde la UI (recomendado para producción)
1. Loguéate en `marketing.maxrent.cl` con un correo de `MARKETING_SUPER_ADMINS`.
2. En el header, click en **"Administrar accesos"**.
3. Agregás/quitás correos desde la página `/admin`. Cambios efectivos al instante (no hay redeploy).

La lista se almacena en la tabla `marketing_access` de la Neon del portal (compartida).

### Opción B — env var (legacy / dev local sin BD)
`MARKETING_ALLOWED_EMAILS` (CSV) sigue funcionando como fallback cuando no hay `DATABASE_URL`. Útil en dev local sin DB. Ejemplo:
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
Proyecto Vercel separado (no comparte con landing ni portal).

### Setup inicial (una sola vez)
1. **vercel.com/new** → importar el repo `nrklhv/maxcap`.
2. **Project Name**: `maxrent-marketing`.
3. **Root Directory**: `maxrent-marketing` (clave — sin esto buildea el landing).
4. **Framework Preset**: Next.js (autodetectado).
5. Agregar las 5 env vars (sección §Variables de entorno) para Production, Preview y Development.
6. **Deploy**.

### Dominio
1. Vercel project → Settings → Domains → Add `marketing.maxrent.cl`.
2. En GoDaddy (DNS de `maxrent.cl`): agregar CNAME `marketing` → `cname.vercel-dns.com`.
3. Esperar verificación + emisión de SSL (~1–2 min).

### Variables de entorno
| Var | Valor | Notas |
|---|---|---|
| `NEXTAUTH_URL` | `https://marketing.maxrent.cl` | URL pública canónica |
| `NEXTAUTH_SECRET` | 32 bytes random | Generar con `openssl rand -base64 32`, distinto al de dev |
| `GOOGLE_CLIENT_ID` | (de Google Cloud) | Mismo valor que en local |
| `GOOGLE_CLIENT_SECRET` | (de Google Cloud) | Mismo valor que en local |
| `MARKETING_SUPER_ADMINS` | CSV de emails | Tienen acceso permanente y pueden gestionar la allowlist desde `/admin` |
| `DATABASE_URL` | conn string Neon | Mismo valor que el portal — solo se accede a la tabla `marketing_access` |
| `MARKETING_ALLOWED_EMAILS` | CSV de emails (opcional) | Fallback dev local; en prod usar `/admin` |

## Rotar secrets

### `NEXTAUTH_SECRET`
1. Generar nuevo valor: `openssl rand -base64 32`.
2. Vercel → Settings → Environment Variables → editar `NEXTAUTH_SECRET` (Production) → guardar.
3. Vercel redeploya automáticamente. **Todas las sesiones activas se invalidan** (los JWT firmados con el secret viejo dejan de validar). Los usuarios tendrán que volver a loguear con Google.
4. Para local: editar `.env.local` y reiniciar `npm run dev`.

### `GOOGLE_CLIENT_SECRET`
1. Google Cloud Console → Credentials → editar el OAuth client `MaxRent Marketing` → **Reset secret**.
2. Copiar el secret nuevo.
3. Vercel → Settings → Environment Variables → editar `GOOGLE_CLIENT_SECRET` → guardar.
4. Vercel redeploya. Login se restablece sin invalidar sesiones existentes (las sesiones viven en el JWT, no dependen del secret de OAuth).
5. Para local: editar `.env.local` y reiniciar `npm run dev`.

### Si filtras un secret (incidente)
1. Rotar **inmediatamente** el secret en Google Cloud (rota el OAuth) y regenerar `NEXTAUTH_SECRET` (invalida sesiones).
2. Revisar logs de auth en Vercel para detectar accesos no esperados.
3. Considerar reducir temporalmente la `MARKETING_ALLOWED_EMAILS` solo a tu correo hasta confirmar que no hubo abuso.
