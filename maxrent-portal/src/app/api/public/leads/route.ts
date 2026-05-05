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
//
// Atribución de referidos:
//   • El landing setea cookie `mxr_ref` por 60d cuando alguien visita con
//     `?ref=INV-XXX` o `?ref=BRK-XXX` (first-touch — ver lib/referralCookie.ts
//     en el repo del landing).
//   • Los forms leen la cookie y la mandan en el body como `referral_code`.
//   • Acá validamos que el code corresponda a un User real (campo
//     `investorReferralCode` o `brokerReferralCode` en `users`) y persistimos
//     la atribución en `Lead.marketingAttribution.referralCode` + ajustamos
//     `Lead.source` a "investor-referral" / "broker-referral".
//   • First-touch: si el lead ya existe con `referralCode` en su attribution,
//     NO sobrescribimos — la primera atribución manda.
//   • Códigos inválidos (formato OK pero no matchean ningún User) se ignoran
//     silenciosamente, no rompen el flujo del lead.
//
// Detalle del sistema de atribución: docs/DATABASE.md sección "Atribución de
// referidos" + memory/project_referral_attribution.md.
// =============================================================================

import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { notifyTemplate } from "@/lib/services/notifications";
import {
  createBrokerLeadForLead,
  createReferralForLead,
  safeRunReferralHook,
} from "@/lib/services/referral.service";
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
// Atribución de referidos
// -----------------------------------------------------------------------------

type ReferralResolution =
  | { kind: "INVESTOR"; code: string; referrerUserId: string }
  | { kind: "BROKER"; code: string; brokerUserId: string };

/**
 * Recibe un code (formato `INV-XXX` o `BRK-XXX` ya validado por Zod) y lo
 * intenta matchear contra `User.investorReferralCode` o `User.brokerReferralCode`.
 * Devuelve null si nadie tiene ese code (atribución silenciosamente ignorada).
 */
async function resolveReferralCode(
  code: string
): Promise<ReferralResolution | null> {
  if (code.startsWith("INV-")) {
    const user = await prisma.user.findUnique({
      where: { investorReferralCode: code },
      select: { id: true },
    });
    if (!user) return null;
    return { kind: "INVESTOR", code, referrerUserId: user.id };
  }
  if (code.startsWith("BRK-")) {
    const user = await prisma.user.findUnique({
      where: { brokerReferralCode: code },
      select: { id: true },
    });
    if (!user) return null;
    return { kind: "BROKER", code, brokerUserId: user.id };
  }
  return null;
}

/**
 * Política first-touch: si el lead existente ya guarda un `referralCode` en
 * su `marketingAttribution`, NO lo sobrescribimos. Evita que un visitante que
 * vuelve días después con otro `?ref=` cambie a quién quedó atribuido.
 */
function existingAttributionHasReferralCode(
  attribution: Prisma.JsonValue | null | undefined
): boolean {
  if (!attribution || typeof attribution !== "object" || Array.isArray(attribution)) {
    return false;
  }
  const ref = (attribution as Record<string, unknown>).referralCode;
  return typeof ref === "string" && ref.length > 0;
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
  const kind =
    data.type === "inversionista"
      ? "INVESTOR"
      : data.type === "vendedor"
        ? "SELLER"
        : "BROKER";

  // -------------------------------------------------------------------------
  // Resolver atribución de referido (si vino code en la cookie del landing)
  // -------------------------------------------------------------------------
  // Si hay code y matchea con un User real, marcamos source como
  // "investor-referral" / "broker-referral" en lugar del default "landing-*".
  // Si el code es inválido o no matchea, tratamos como lead orgánico (no falla).
  // PR 3 va a crear el `Referral`/`BrokerLead` correspondiente; este PR solo
  // captura la atribución en `Lead.marketingAttribution.referralCode`.
  const referralCode = "referral_code" in data ? data.referral_code : undefined;
  const referralResolution = referralCode
    ? await resolveReferralCode(referralCode)
    : null;

  const defaultSource =
    data.type === "inversionista"
      ? "landing-investor"
      : data.type === "vendedor"
        ? "landing-seller"
        : "landing-broker";
  const source = referralResolution
    ? referralResolution.kind === "INVESTOR"
      ? "investor-referral"
      : "broker-referral"
    : defaultSource;

  // marketingAttribution ahora puede sumar el referralCode si la atribución
  // resolvió a un User. Lo dejamos siempre como objeto (no null) cuando hay
  // ALGO que guardar — utm_* del landing o code resuelto.
  const baseAttribution =
    data.marketing_attribution == null
      ? {}
      : (data.marketing_attribution as Record<string, unknown>);
  const attributionWithReferral: Prisma.InputJsonValue | undefined =
    referralResolution
      ? ({
          ...baseAttribution,
          referralCode: referralResolution.code,
          referralKind: referralResolution.kind,
        } as Prisma.InputJsonValue)
      : data.marketing_attribution == null
        ? undefined
        : (data.marketing_attribution as Prisma.InputJsonValue);

  // Campos vendedor (null si es inversionista o broker)
  const cantidadPropiedades =
    data.type === "vendedor" ? data.cantidad_propiedades : null;
  const arrendadas = data.type === "vendedor" ? data.arrendadas : null;
  const adminHoum = data.type === "vendedor" ? data.admin_houm : null;

  // Empresa solo aplica al broker; va al campo flexible `data` para no
  // sumar columna nueva al schema.
  const dataJson: Prisma.InputJsonValue | undefined =
    data.type === "broker" ? { companyName: data.empresa.trim() } : undefined;

  try {
    // First-touch: si el lead ya existe con un referralCode previo en su
    // marketingAttribution, NO lo sobrescribimos. Lookup primero para decidir.
    const existingLead = await prisma.lead.findUnique({
      where: { email },
      select: { id: true, marketingAttribution: true, source: true },
    });

    const preserveExistingReferral =
      existingLead != null &&
      existingAttributionHasReferralCode(existingLead.marketingAttribution);

    // Cuando preservamos atribución previa, NO tocamos ni `source` ni
    // `marketingAttribution` en el update — los dejamos como llegaron al
    // primer hit. Sí actualizamos los demás campos del form.
    const updateAttributionFields = preserveExistingReferral
      ? {}
      : { source, marketingAttribution: attributionWithReferral };

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
        marketingAttribution: attributionWithReferral,
        data: dataJson,
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
        ...updateAttributionFields,
        data: dataJson,
      },
      select: { id: true, status: true, createdAt: true, updatedAt: true },
    });

    const isNew = lead.createdAt.getTime() === lead.updatedAt.getTime();

    // -----------------------------------------------------------------------
    // Crear Referral / BrokerLead idempotentemente si hubo atribución resuelta.
    // -----------------------------------------------------------------------
    // Solo cuando NO preservamos atribución previa — si el lead ya tenía
    // referralCode y mantenemos first-touch, asumimos que el Referral/BrokerLead
    // original ya existe (se creó cuando llegó por primera vez).
    //
    // El service hace upsert con leadId como key; corre sin riesgo de duplicar.
    // Errores se loguean pero NO rompen la respuesta — la atribución es
    // best-effort, el lead ya quedó persistido.
    if (referralResolution && !preserveExistingReferral) {
      if (referralResolution.kind === "INVESTOR") {
        await safeRunReferralHook("createReferralForLead", () =>
          createReferralForLead({
            leadId: lead.id,
            code: referralResolution.code,
            referrerUserId: referralResolution.referrerUserId,
            referredEmail: email,
          })
        );
      } else {
        await safeRunReferralHook("createBrokerLeadForLead", () =>
          createBrokerLeadForLead({
            leadId: lead.id,
            code: referralResolution.code,
            brokerUserId: referralResolution.brokerUserId,
            prospectEmail: email,
          })
        );
      }
    }

    // Disparar email de bienvenida solo para inversionistas nuevos.
    // Vendedor por ahora no recibe email transaccional desde este flujo.
    // Fire-and-forget: no bloqueamos la respuesta del endpoint si el
    // proveedor falla; el error queda registrado en la tabla Notification.
    if (isNew && data.type === "inversionista") {
      const portalUrl =
        process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "") ||
        "https://portal.maxrent.cl";
      void notifyTemplate({
        template: "welcome-investor",
        to: email,
        variables: {
          firstName,
          email,
          portalUrl,
        },
      }).catch((e) => {
        // notifyTemplate ya graba FAILED en Notification, esto es solo log.
        console.error("/api/public/leads — welcome notify error", e);
      });
    }

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
