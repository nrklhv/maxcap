/**
 * Auth0 machine-to-machine access token for server-side Houm API calls.
 * Caches for 23h and serializes concurrent refresh (see machine-to-machine-tokens.md).
 *
 * @domain maxrent-portal
 * @see maxrent-portal/machine-to-machine-tokens.md
 */

const TTL_MS = 23 * 60 * 60 * 1000;

let cachedToken: { value: string; expiresAt: number } | null = null;
let inflight: Promise<string> | null = null;

function requiredEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function isM2mConfigured(): boolean {
  return Boolean(
    process.env.AUTH0_DOMAIN?.trim() &&
      process.env.AUTH0_CLIENT_ID?.trim() &&
      process.env.AUTH0_CLIENT_SECRET?.trim() &&
      process.env.AUTH0_API_AUDIENCE?.trim()
  );
}

export function invalidateMachineAuthToken(): void {
  cachedToken = null;
}

export async function getMachineAuthToken(): Promise<string> {
  const now = Date.now();

  if (cachedToken && cachedToken.expiresAt > now) {
    return cachedToken.value;
  }

  if (inflight) return inflight;

  inflight = (async () => {
    const domain = requiredEnv("AUTH0_DOMAIN").replace(/^https?:\/\//, "");
    const res = await fetch(`https://${domain}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: requiredEnv("AUTH0_CLIENT_ID"),
        client_secret: requiredEnv("AUTH0_CLIENT_SECRET"),
        audience: requiredEnv("AUTH0_API_AUDIENCE"),
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Auth0 token request failed: ${res.status} ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as { access_token?: string };
    if (!data.access_token) {
      throw new Error("Auth0 token response missing access_token");
    }
    cachedToken = { value: data.access_token, expiresAt: now + TTL_MS };
    return data.access_token;
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

/**
 * Performs an HTTP request with Bearer M2M token; on 401 clears cache and retries once.
 */
export async function fetchWithM2m(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const doRequest = async () => {
    const token = await getMachineAuthToken();
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    if (!headers.has("Accept")) headers.set("Accept", "application/json");
    return fetch(input, { ...init, headers });
  };

  let res = await doRequest();
  if (res.status === 401) {
    invalidateMachineAuthToken();
    res = await doRequest();
  }
  return res;
}
