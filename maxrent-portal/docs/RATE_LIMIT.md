# Rate limiting

> Storage compartido entre instancias serverless de Vercel: **Vercel KV** (Upstash Redis bajo el capó). 4 buckets nombrados. Fail-open en dev local sin la integración configurada.

## Por qué

Vercel es serverless — un rate limiter in-memory no funciona porque (a) cada cold start reinicia el contador y (b) dos requests pueden ir a instancias distintas que no se ven. Necesitamos un storage compartido con baja latencia y atomicidad. Redis vía Vercel KV es la opción canónica.

## Setup

1. Vercel Dashboard → proyecto **maxrent-portal** → **Storage** (o **Integrations** / **Marketplace** según versión) → activar **Upstash for Redis**.
2. Región **iad1** (us-east-1) — alinea con Neon us-east-2 y minimiza latencia.
3. Plan Free es suficiente para empezar; subir cuando se acerque al límite de comandos.
4. Linkear al proyecto y permitir que Vercel inyecte env vars en **Production + Preview + Development**.

Vercel pone automáticamente:

```
KV_REST_API_URL
KV_REST_API_TOKEN
KV_REST_API_READ_ONLY_TOKEN
KV_URL
REDIS_URL
…
```

El módulo solo usa `KV_REST_API_URL` y `KV_REST_API_TOKEN`. Si **faltan**, entra en modo fail-open silencioso (no bloquea, loguea un warn una sola vez).

## Buckets

Definidos en [`src/lib/rate-limit-core.ts`](../src/lib/rate-limit-core.ts) como `RATE_LIMITS`. Sliding window contra Upstash.

| Bucket | Límite | Identificación | Aplica a |
|---|---|---|---|
| **A · `webhook`** | 60/min por IP | IP del cliente | `/api/payments/webhook`, `/api/floid/callback`, `/api/notifications/webhook/resend` |
| **B · `public`** | 10/min por IP | IP del cliente | `/api/public/leads` |
| **C · `authenticated`** | 60/min por userId (o IP) | userId si hay sesión, sino IP | `/api/portal/pools`, `/api/portal/pools/[slug]`, `/api/portal/pool-units/[id]`, `/api/portal/catalog-properties` |
| **D · `expensive`** | 5/min por userId (o IP) | userId si hay sesión, sino IP | `/api/floid/evaluate`, `POST /api/reservations`, `POST /api/payments/checkout` |

Ajustar números: editar `RATE_LIMITS` y deployar. No requiere migración.

## Cómo usarlo desde un route handler

```ts
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limited = await applyRateLimit(req, RATE_LIMITS.public, { route: "leads" });
  if (limited) return limited; // 429 con Retry-After + X-RateLimit-* headers
  // … resto del handler
}
```

El parámetro `route` se incluye en la key del rate limiter, así dos endpoints distintos con el mismo bucket no comparten contador.

### Cuando necesitas controlar la respuesta

Si tu endpoint tiene CORS u otra forma de respuesta (ej. `/api/public/leads` con `jsonWithCors`), usa `checkRateLimit` que devuelve `{ success, remaining, reset, skipped }` y arma la respuesta tú:

```ts
const rl = await checkRateLimit(req, RATE_LIMITS.public, { route: "leads" });
if (!rl.success && !rl.skipped) {
  const retryAfter = Math.max(1, Math.ceil((rl.reset - Date.now()) / 1000));
  return jsonWithCors(
    { error: "Demasiadas solicitudes." },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(RATE_LIMITS.public.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(rl.reset / 1000)),
        "Retry-After": String(retryAfter),
      },
    },
    req
  );
}
```

## Arquitectura del módulo

Dos archivos:

- **`src/lib/rate-limit-core.ts`** — lógica pura sin Next/NextAuth. Cliente de Upstash, configuración de buckets, `checkRateLimitForKey(subject, cfg)`, `getClientIp`. **Testeable sin mocks.**
- **`src/lib/rate-limit.ts`** — wrapper alto nivel. Resuelve identidad (IP + sesión NextAuth), expone `checkRateLimit(req, cfg)` y `applyRateLimit(req, cfg)` que devuelve `NextResponse 429`.

Separación motivada porque importar `auth()` de NextAuth en un test de Vitest falla (no resuelve `next/server`). El core no toca NextAuth.

## Respuesta 429

Headers estándar (RFC 6585 + de facto industry):

| Header | Significado |
|---|---|
| `X-RateLimit-Limit` | Máximo en la ventana |
| `X-RateLimit-Remaining` | Cuánto queda (0 cuando devolvemos 429) |
| `X-RateLimit-Reset` | Epoch en segundos cuando se reinicia el bucket |
| `Retry-After` | Segundos hasta el reset |

Body: `{ "error": "Demasiadas solicitudes. Intenta de nuevo en unos segundos.", "retryAfter": <seg> }`.

## Identificación del cliente

`getClientIp(req)` lee en este orden:

1. Primera entry de `x-forwarded-for` (header que Vercel pone con la IP real del cliente).
2. `x-real-ip`.
3. `cf-connecting-ip` (Cloudflare).
4. Fallback `"unknown"` — todos los anónimos comparten bucket (más conservador).

Para buckets `identifyBy: "userIdOrIp"`, intentamos primero `session.user.id` de NextAuth; si no hay sesión, caemos a IP.

## Costos

Free tier de Vercel KV: 30k commands/mes (≈10k requests rate-limited, porque cada hit consume ~3 commands: read + write + ttl). Suficiente para tráfico de beta cerrado. Cuando crezca, escalar a paid plan ($1 por 100k commands extras al mes del orden).

## Cómo verificar en producción

Después de mergear, desde tu terminal:

```bash
# Disparar 12 requests seguidas al endpoint público; las primeras 10 deberían
# ir bien y la 11ª devolver 429.
for i in {1..12}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://portal.maxrent.cl/api/public/leads \
    -H "Content-Type: application/json" \
    -d '{"email":"prueba@example.com","kind":"INVESTOR"}'
done
# Esperado: 400 400 400 400 400 400 400 400 400 400 429 429
# (los 400 son porque el body es inválido — el rate limit corre ANTES del schema)
```

Si ves todos 400 (ninguno 429), el rate limit no está activo: revisa que `KV_REST_API_URL` esté seteada en Production en Vercel.

## Roadmap

- Analytics dashboard de Upstash (prender `analytics: true` en el `Ratelimit` constructor para ver bloqueos en el dashboard de Upstash).
- Rate limit por endpoint individual (más granular que por bucket) para `/api/floid/evaluate` que es especialmente caro.
- Lista de IPs allowlisteadas para los webhooks de proveedores conocidos (MP, Floid, Resend) para subir el bucket a ellos sin abrir a todo el mundo.
