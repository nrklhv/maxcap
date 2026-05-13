/**
 * Core puro del rate limiter — sin Next/NextAuth, testeable sin mocks.
 *
 * Este archivo solo conoce:
 *   - El cliente de Upstash Redis (creado desde env vars de Vercel KV).
 *   - La configuración de los 4 buckets.
 *   - Una función `checkRateLimitForKey(subject, cfg)` que recibe el
 *     identificador del cliente ya resuelto.
 *
 * La integración con NextAuth (`auth()`) y NextResponse vive en
 * `./rate-limit.ts`. La separación permite testear esta capa sin levantar
 * todo NextAuth en el entorno de Vitest.
 *
 * @domain seguridad
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ---------------------------------------------------------------------------
// Client singleton + fail-open detection
// ---------------------------------------------------------------------------

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

let warnedAboutMissingKv = false;
function warnMissingKvOnce(): void {
  if (warnedAboutMissingKv) return;
  warnedAboutMissingKv = true;
  console.warn(
    "[rate-limit] Vercel KV no configurada (faltan KV_REST_API_URL / KV_REST_API_TOKEN). " +
      "Rate limit DESACTIVADO. En producción activa la integración Upstash desde Vercel."
  );
}

const redis: Redis | null =
  KV_URL && KV_TOKEN ? new Redis({ url: KV_URL, token: KV_TOKEN }) : null;

// ---------------------------------------------------------------------------
// Bucket configuration
// ---------------------------------------------------------------------------

export type RateLimitConfig = {
  /** Identificador estable para logs y prefijo de la key en Redis. */
  name: "webhook" | "public" | "authenticated" | "expensive";
  /** Máximo de requests permitidos en la ventana. */
  limit: number;
  /** Ventana sliding como string compatible con Upstash: "1 m", "10 s", etc. */
  window: `${number} ${"s" | "m" | "h"}`;
  /** Cómo identificar al cliente. */
  identifyBy: "ip" | "userIdOrIp";
};

export const RATE_LIMITS = {
  /** A — webhooks de proveedores (Mercado Pago, Floid, Resend). 60/min por IP. */
  webhook: {
    name: "webhook",
    limit: 60,
    window: "1 m",
    identifyBy: "ip",
  },
  /** B — endpoints públicos sin auth (forms del landing). 10/min por IP. */
  public: {
    name: "public",
    limit: 10,
    window: "1 m",
    identifyBy: "ip",
  },
  /** C — endpoints autenticados de lectura/escritura normal. 60/min por usuario. */
  authenticated: {
    name: "authenticated",
    limit: 60,
    window: "1 m",
    identifyBy: "userIdOrIp",
  },
  /** D — endpoints caros (Floid start, crear reserva). 5/min por usuario. */
  expensive: {
    name: "expensive",
    limit: 5,
    window: "1 m",
    identifyBy: "userIdOrIp",
  },
} as const satisfies Record<string, RateLimitConfig>;

// ---------------------------------------------------------------------------
// Ratelimit instances (memoized — 1 por bucket)
// ---------------------------------------------------------------------------

const instances = new Map<string, Ratelimit>();

function getOrCreateLimiter(cfg: RateLimitConfig): Ratelimit | null {
  if (!redis) return null;
  const key = `${cfg.name}:${cfg.limit}:${cfg.window}`;
  let inst = instances.get(key);
  if (!inst) {
    inst = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(cfg.limit, cfg.window),
      prefix: `mxr:rl:${cfg.name}`,
      analytics: false,
    });
    instances.set(key, inst);
  }
  return inst;
}

// ---------------------------------------------------------------------------
// IP extraction helper
// ---------------------------------------------------------------------------

/**
 * Extrae la IP del cliente desde headers de Vercel/Cloudflare. Cae a "unknown"
 * si no encuentra nada — eso unifica TODOS los anónimos en un mismo bucket,
 * más conservador que generar buckets distintos por header sospechoso.
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xri = req.headers.get("x-real-ip");
  if (xri?.trim()) return xri.trim();
  const cfip = req.headers.get("cf-connecting-ip");
  if (cfip?.trim()) return cfip.trim();
  return "unknown";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type RateLimitCheckResult = {
  /** True si la petición está dentro del límite. */
  success: boolean;
  /** Cantidad restante en la ventana actual. */
  remaining: number;
  /** Cuándo (ms epoch) se reinicia el bucket. */
  reset: number;
  /** Si no se aplicó porque KV no está configurada, true. */
  skipped: boolean;
};

/**
 * Chequea el límite contra Redis para una key arbitraria. Si KV no está
 * configurada, devuelve `skipped:true` y NO bloquea.
 *
 * El parámetro `subject` debe venir ya resuelto (ej. `"user:abc"` o
 * `"ip:1.2.3.4"`). El caller decide cómo identifica al cliente.
 */
export async function checkRateLimitForKey(
  subject: string,
  cfg: RateLimitConfig,
  opts?: { route?: string }
): Promise<RateLimitCheckResult> {
  const limiter = getOrCreateLimiter(cfg);
  if (!limiter) {
    warnMissingKvOnce();
    return { success: true, remaining: cfg.limit, reset: 0, skipped: true };
  }

  const routeSuffix = opts?.route ? `:${opts.route}` : "";
  const key = `${subject}${routeSuffix}`;

  const r = await limiter.limit(key);
  return {
    success: r.success,
    remaining: r.remaining,
    reset: r.reset,
    skipped: false,
  };
}

/**
 * Predicado para tests: ¿está activo el rate limiter? (false en dev sin KV).
 * No usar para decidir lógica de negocio; solo para asserts/logs.
 */
export function isRateLimitEnabled(): boolean {
  return redis !== null;
}
