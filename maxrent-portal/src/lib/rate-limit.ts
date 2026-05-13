/**
 * Rate limiting con Vercel KV (Upstash Redis bajo el capó).
 *
 * 4 buckets:
 *   • A — webhook proveedor   (60/min por IP)
 *   • B — público estricto    (10/min por IP)
 *   • C — autenticado normal  (60/min por userId, fallback IP)
 *   • D — caro                (5/min por userId, fallback IP)
 *
 * Uso típico desde un route handler:
 *
 *   import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
 *
 *   export async function POST(req: Request) {
 *     const limited = await applyRateLimit(req, RATE_LIMITS.public, { route: "lead-form" });
 *     if (limited) return limited;
 *     …
 *   }
 *
 * **Arquitectura del módulo**: este archivo es el wrapper "alto nivel" que
 * resuelve identidad (IP + sesión NextAuth) y arma respuestas HTTP. La lógica
 * pura está en `./rate-limit-core.ts` — ese sí es testeable sin Next/NextAuth.
 * Si necesitas tests, importa del core; si necesitas integración, de acá.
 *
 * Si Vercel KV no está configurada (env vars ausentes), el módulo entra en
 * modo "fail-open" silencioso: no aplica límites y loguea un warn una sola vez.
 * Eso permite correr el portal en dev sin Vercel KV. En producción Vercel
 * inyecta `KV_REST_API_URL` + `KV_REST_API_TOKEN` automáticamente al activar
 * la integración Upstash; si por alguna razón faltan, vale la pena revisar.
 *
 * @domain seguridad
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  RATE_LIMITS,
  checkRateLimitForKey,
  getClientIp,
  isRateLimitEnabled,
  type RateLimitCheckResult,
  type RateLimitConfig,
} from "./rate-limit-core";

export {
  RATE_LIMITS,
  getClientIp,
  isRateLimitEnabled,
  type RateLimitCheckResult,
  type RateLimitConfig,
};

// ---------------------------------------------------------------------------
// Client identifier resolution
// ---------------------------------------------------------------------------

async function resolveIdentifier(
  req: Request,
  cfg: RateLimitConfig
): Promise<string> {
  if (cfg.identifyBy === "ip") {
    return `ip:${getClientIp(req)}`;
  }
  // userIdOrIp: preferimos userId si está logueado.
  const session = await auth();
  if (session?.user?.id) {
    return `user:${session.user.id}`;
  }
  return `ip:${getClientIp(req)}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Chequea el rate limit sin devolver una `NextResponse`. Útil si necesitas
 * lógica custom (loguear, mezclar con otro check, etc.).
 */
export async function checkRateLimit(
  req: Request,
  cfg: RateLimitConfig,
  opts?: { route?: string; subjectOverride?: string }
): Promise<RateLimitCheckResult> {
  const subject = opts?.subjectOverride ?? (await resolveIdentifier(req, cfg));
  return checkRateLimitForKey(subject, cfg, { route: opts?.route });
}

/**
 * Aplica rate limit y devuelve una `NextResponse` 429 si se excedió. Si no,
 * devuelve `null` para que el handler siga su flujo normal.
 *
 * Headers estándar de la respuesta 429:
 *   - X-RateLimit-Limit: max requests in window
 *   - X-RateLimit-Remaining: 0 (excedido)
 *   - X-RateLimit-Reset: epoch seconds
 *   - Retry-After: seconds until reset (RFC 6585)
 */
export async function applyRateLimit(
  req: Request,
  cfg: RateLimitConfig,
  opts?: { route?: string; subjectOverride?: string }
): Promise<NextResponse | null> {
  const r = await checkRateLimit(req, cfg, opts);
  if (r.success || r.skipped) return null;

  const retryAfterSec = Math.max(1, Math.ceil((r.reset - Date.now()) / 1000));
  return NextResponse.json(
    {
      error: "Demasiadas solicitudes. Intenta de nuevo en unos segundos.",
      retryAfter: retryAfterSec,
    },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(cfg.limit),
        "X-RateLimit-Remaining": String(r.remaining),
        "X-RateLimit-Reset": String(Math.ceil(r.reset / 1000)),
        "Retry-After": String(retryAfterSec),
      },
    }
  );
}
