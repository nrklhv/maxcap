// =============================================================================
// POST /api/public/leads — endpoint público para captura de leads desde el landing
// =============================================================================
//
// Llamado por los formularios públicos del landing (inversionista / vendedor).
// Crea (o actualiza) un Lead idempotente por email. No requiere autenticación.
//
// El flujo de magic link / login se maneja en una etapa siguiente: este endpoint
// solo persiste el lead. La UX post-submit redirige al portal `/login` con el
// email pre-llenado.
//
// CORS: solo se aceptan requests desde los orígenes del landing
// (configurable vía LEADS_ALLOWED_ORIGINS, comma-separated).
// =============================================================================

import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { leadPublicBodySchema } from "@/lib/validations";

// Edge no soporta Prisma; forzamos node runtime.
export const runtime = "nodejs";
// Endpoint dinámico, sin caché.
export const dynamic = "force-dynamic";

// -----------------------------------------------------------------------------
// CORS helpers
// -----------------------------------------------------------------------------

const DEFAULT_ALLOWED_ORIGINS = [
  "https://www.maxrent.cl",
  "https://maxrent.cl",
];

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
  // Permite preview deploys de Vercel (`*.vercel.app`) si NODE_ENV no es production
  // o si LEADS_ALLOW_VERCEL_PREVIEWS=true. Útil para QA antes de mergear a main.
  const allowVercelPreviews =
    process.env.LEADS_ALLOW_VERCEL_PREVIEWS === "true" ||
    process.env.NODE_ENV !== "production";
  const isVercelPreview =
    allowVercelPreviews && /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin);

  const isAllowed = allowed.includes(origin) || isVercelPreview;
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function jsonWithCors(
  body: unknown,
  init: { status?: number } = {},
  req: NextRequest
) {
  return NextResponse.json(body, {
    status: init.status ?? 200,
    headers: corsHeadersFor(req),
  });
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
// POST
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return jsonWithCors({ error: "Solicitud inválida" }, { status: 400 }, req);
  }

  const parsed = leadPublicBodySchema.safeParse(payload);
  if (!parsed.success) {
    return jsonWithCors(
      { error: "Revisa los datos ingresados" },
      { status: 400 },
      req
    );
  }
  const data = parsed.data;

  // Normalizaciones consistentes con la convención del portal.
  const email = data.email.toLowerCase();
  const firstName = data.nombre.trim();
  const lastName = data.apellido.trim();
  const fullName = `${firstName} ${lastName}`.trim();
  const phone = data.whatsapp.trim();
  const kind = data.type === "inversionista" ? "INVESTOR" : "SELLER";
  const source =
    data.type === "inversionista" ? "landing-investor" : "landing-seller";
  const marketingAttribution: Prisma.InputJsonValue | undefined =
    data.marketing_attribution == null
      ? undefined
      : (data.marketing_attribution as Prisma.InputJsonValue);

  // Campos vendedor (null si es inversionista)
  const cantidadPropiedades =
    data.type === "vendedor" ? data.cantidad_propiedades : null;
  const arrendadas = data.type === "vendedor" ? data.arrendadas : null;
  const adminHoum = data.type === "vendedor" ? data.admin_houm : null;

  try {
    const lead = await prisma.lead.upsert({
      where: { email },
      create: {
        email,
        kind,
        status: "NEW",
        firstName,
        lastName,
        name: fullName,
        phone,
        cantidadPropiedades,
        arrendadas,
        adminHoum,
        source,
        marketingAttribution,
      },
      update: {
        // Idempotente: refrescamos los datos del form en cada submit por si el
        // usuario corrigió algo. NO degradamos status (un lead REGISTERED no
        // vuelve a NEW por reenvío del form).
        kind,
        firstName,
        lastName,
        name: fullName,
        phone,
        cantidadPropiedades,
        arrendadas,
        adminHoum,
        source,
        marketingAttribution,
      },
      select: { id: true, status: true, createdAt: true, updatedAt: true },
    });

    const isNew = lead.createdAt.getTime() === lead.updatedAt.getTime();

    return jsonWithCors(
      {
        ok: true,
        leadId: lead.id,
        isNew,
      },
      { status: isNew ? 201 : 200 },
      req
    );
  } catch (err) {
    // Logueamos detalle solo en server, devolvemos mensaje neutro al cliente.
    console.error("/api/public/leads — upsert error", err);
    return jsonWithCors(
      { error: "No pudimos guardar tu solicitud. Intenta de nuevo." },
      { status: 500 },
      req
    );
  }
}
