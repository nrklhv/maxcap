/**
 * GET /api/public/uf-rate — UF chilena cacheada, expuesta al landing público.
 *
 * Usado por www.maxrent.cl para mostrar el badge "1 UF = $X" en el header.
 * El portal cachea la UF diariamente vía cron `/api/cron/refresh-uf` (ver
 * `docs/UF_RATE.md`); este endpoint solo lee el último valor de la BD.
 *
 * Sin auth. Mismo patrón de CORS que `/api/public/leads`: allowlist via env
 * `LEADS_ALLOWED_ORIGINS` (reutilizada — son los mismos orígenes), + previews
 * `*.vercel.app` permitidos en non-production. Rate limit `public` (10/min IP).
 *
 * Si todavía no hay UF cacheada (post-deploy fresco) devuelve `{ uf: null }`
 * con status 200 — el cliente decide qué mostrar (típicamente: nada).
 *
 * @source GET /api/public/uf-rate
 * @domain uf / public
 */

import { NextResponse, type NextRequest } from "next/server";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getLatestUfRate } from "@/lib/services/uf.service";

export const runtime = "nodejs";
// El endpoint es dynamic (lee headers del request para CORS + rate limit IP),
// pero la response trae `Cache-Control: s-maxage=1800` para que Vercel CDN la
// cachee 30 min. La UF cambia 1 vez al día, no necesita estar más fresca.

// -----------------------------------------------------------------------------
// CORS helpers — mismos orígenes que /api/public/leads.
// -----------------------------------------------------------------------------

const DEFAULT_ALLOWED_ORIGINS = ["https://www.maxrent.cl", "https://maxrent.cl"];

function allowedOrigins(): string[] {
  const fromEnv = process.env.LEADS_ALLOWED_ORIGINS?.trim();
  if (!fromEnv) return DEFAULT_ALLOWED_ORIGINS;
  return fromEnv
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function corsHeadersFor(req: NextRequest): HeadersInit {
  const origin = req.headers.get("origin") ?? "";
  const allowed = allowedOrigins();
  const allowVercelPreviews =
    process.env.LEADS_ALLOW_VERCEL_PREVIEWS === "true" ||
    process.env.NODE_ENV !== "production";
  const isVercelPreview =
    allowVercelPreviews && /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin);
  const isAllowed = allowed.includes(origin) || isVercelPreview;
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "null",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

// -----------------------------------------------------------------------------
// OPTIONS — CORS preflight
// -----------------------------------------------------------------------------

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeadersFor(req),
  });
}

// -----------------------------------------------------------------------------
// GET
// -----------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMITS.public, {
    route: "public-uf-rate",
  });
  if (limited) {
    // El 429 devuelto por el rate limiter no trae CORS — lo añadimos in-place
    // para que el browser pueda leer el error en lugar de un opaque fail.
    const cors = corsHeadersFor(req) as Record<string, string>;
    for (const [k, v] of Object.entries(cors)) {
      limited.headers.set(k, v);
    }
    return limited;
  }

  const latest = await getLatestUfRate();
  return NextResponse.json(
    latest
      ? {
          uf: {
            date: latest.date.toISOString().slice(0, 10),
            valueClp: latest.valueClp,
            source: latest.source,
          },
        }
      : { uf: null },
    {
      headers: {
        ...corsHeadersFor(req),
        // Cache HTTP en Vercel CDN + browser por 30 min, con SWR.
        "Cache-Control":
          "public, s-maxage=1800, max-age=300, stale-while-revalidate=86400",
      },
    }
  );
}
