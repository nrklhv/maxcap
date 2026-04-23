# Tokens Machine-to-Machine (M2M) con Auth0

Guía de referencia para generar y cachear tokens M2M en servicios internos (Python y TypeScript).

## 1. Contexto

Los servicios backend se autentican entre sí usando **tokens M2M de Auth0** obtenidos mediante el flujo `client_credentials`. Cada servicio actúa como cliente y pide un access token a Auth0 presentando sus credenciales.

### Flujo

```
Service  ──(client_id + client_secret + audience)──▶  Auth0 /oauth/token
Service  ◀──────────(access_token, expires_in)───────  Auth0
Service  ──(Authorization: Bearer <token>)──▶  API destino
```

## 2. Regla de oro: **cachear el token**

Los tokens de Auth0 emitidos con `client_credentials` tienen una expiración (`expires_in`) de **24 horas (86400 s)** por defecto.

**No se debe pedir un token nuevo en cada request.** Esto:

- Dispara el rate limit de Auth0 (el tenant tiene cuotas mensuales de M2M tokens facturables).
- Introduce latencia innecesaria (`/oauth/token` agrega ~200–500 ms por llamada).
- Genera carga inútil sobre el proveedor.

### TTL recomendado: **23 horas** (82800 s)

Siempre cachear con un TTL **menor** al `expires_in` real para evitar usar un token que expire a mitad de una request. 23 h deja un margen seguro de 1 hora.

| Variable | Valor |
|---|---|
| Expiración real del token (Auth0) | 86400 s (24 h) |
| TTL del cache | **82800 s (23 h)** |
| Margen de seguridad | 3600 s (1 h) |

### Requisitos del cache

1. **In-memory y por proceso** es suficiente para servicios simples. Cada worker/instancia mantiene su propio token; el costo extra es marginal.
2. **Thread-safe**: si el servicio usa múltiples threads/workers, el cache debe serializar la obtención inicial para evitar múltiples llamadas concurrentes a Auth0 (stampede).
3. **Keyed por `audience`**: si el servicio consume distintas APIs con distintos audiences, el cache debe distinguir por audience (o exponer una función por cada una).
4. **Invalidación ante 401**: si un endpoint responde `401 Unauthorized`, invalidar el cache y reintentar **una sola vez** antes de propagar el error.

## 3. Variables de entorno

Todos los servicios deben leer estas variables desde su capa de configuración (no hardcodear):

```
AUTH0_DOMAIN            # ej: houm.auth0.com
AUTH0_CLIENT_ID         # client id del M2M application
AUTH0_CLIENT_SECRET     # client secret (secreto; leer desde secret manager)
AUTH0_API_AUDIENCE      # identificador de la API destino
```

El `client_secret` **nunca** se commitea ni se loggea. Debe venir de un secret manager (AWS Secrets Manager, Vault, variables de entorno del deploy, etc.).

## 4. Request a Auth0

`POST https://{AUTH0_DOMAIN}/oauth/token`

Body (JSON):

```json
{
  "grant_type": "client_credentials",
  "client_id": "<AUTH0_CLIENT_ID>",
  "client_secret": "<AUTH0_CLIENT_SECRET>",
  "audience": "<AUTH0_API_AUDIENCE>"
}
```

Respuesta:

```json
{
  "access_token": "eyJhbGciOi...",
  "scope": "read:leads write:leads",
  "expires_in": 86400,
  "token_type": "Bearer"
}
```

Consumir siempre sólo `access_token`. El resto es informativo.

## 5. Implementaciones de referencia

### Python

Usar `cachetools.func.ttl_cache` (ya instalado en estos servicios):

```python
import requests
from cachetools.func import ttl_cache

from src.settings import settings


@ttl_cache(ttl=60 * 60 * 23)  # 23 horas
def get_machine_auth_token() -> str:
    """Devuelve un access token M2M de Auth0, cacheado por 23 h."""
    url = f"https://{settings.AUTH0_DOMAIN}/oauth/token"
    payload = {
        "grant_type": "client_credentials",
        "client_id": settings.AUTH0_CLIENT_ID,
        "client_secret": settings.AUTH0_CLIENT_SECRET,
        "audience": settings.AUTH0_API_AUDIENCE,
    }
    response = requests.post(url, json=payload, timeout=10)
    response.raise_for_status()
    return response.json()["access_token"]
```

Uso:

```python
token = get_machine_auth_token()
response = requests.get(url, headers={"Authorization": f"Bearer {token}"})
```

**Reintento ante 401** (patrón recomendado):

```python
from cachetools.func import ttl_cache

def _call_with_token(do_request):
    token = get_machine_auth_token()
    response = do_request(token)
    if response.status_code == 401:
        get_machine_auth_token.cache_clear()
        token = get_machine_auth_token()
        response = do_request(token)
    return response
```

### TypeScript / Node.js

No hay una lib oficial única — se usa un cache in-memory manual. Patrón recomendado:

```ts
/**
 * Obtains and caches an Auth0 M2M access token.
 * Cached for 23h to stay well below the 24h Auth0 expiration.
 */
let cachedToken: { value: string; expiresAt: number } | null = null;
let inflight: Promise<string> | null = null;

const TTL_MS = 23 * 60 * 60 * 1000; // 23 horas

export async function getMachineAuthToken(): Promise<string> {
  const now = Date.now();

  if (cachedToken && cachedToken.expiresAt > now) {
    return cachedToken.value;
  }

  if (inflight) return inflight;

  inflight = (async () => {
    const res = await fetch(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        audience: process.env.AUTH0_API_AUDIENCE,
      }),
    });

    if (!res.ok) {
      throw new Error(`Auth0 token request failed: ${res.status}`);
    }

    const data = (await res.json()) as { access_token: string };
    cachedToken = { value: data.access_token, expiresAt: now + TTL_MS };
    return data.access_token;
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

export function invalidateMachineAuthToken(): void {
  cachedToken = null;
}
```

Claves del patrón:

- `cachedToken` guarda valor + `expiresAt` absoluto.
- `inflight` evita el **thundering herd**: si varias requests piden el token simultáneamente mientras no hay cache, todas esperan la misma Promise.
- `invalidateMachineAuthToken()` se expone para invalidar manualmente ante un 401.

Uso con reintento:

```ts
async function authedFetch(input: RequestInfo, init: RequestInit = {}) {
  const doRequest = async () => {
    const token = await getMachineAuthToken();
    return fetch(input, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
    });
  };

  let res = await doRequest();
  if (res.status === 401) {
    invalidateMachineAuthToken();
    res = await doRequest();
  }
  return res;
}
```

## 6. Checklist al implementar

- [ ] Credenciales leídas desde config / secret manager, nunca hardcodeadas.
- [ ] TTL del cache = **23 h** (`60 * 60 * 23` s o `23 * 60 * 60 * 1000` ms).
- [ ] Un único punto de obtención del token por servicio (una función/módulo).
- [ ] Protección contra llamadas concurrentes (thread-safe en Python; `inflight` promise en TS).
- [ ] Timeout en la request HTTP a Auth0 (10 s es razonable).
- [ ] Reintento **único** ante 401 invalidando el cache.
- [ ] Nunca loggear el `access_token` ni el `client_secret`.
- [ ] Si el servicio consume múltiples audiences, keyear el cache por audience.

## 7. Anti-patrones

- Pedir token en cada request → rate limit + latencia.
- TTL igual o mayor a `expires_in` → el token puede expirar a mitad de request.
- Cachear en disco sin cifrar → el token es una credencial de portador (bearer).
- Reintentar indefinidamente ante 401 → loop infinito si las credenciales están mal.
- Compartir un cache distribuido (Redis) para el token M2M cuando cada instancia puede mantener el suyo — agrega complejidad sin beneficio real.
