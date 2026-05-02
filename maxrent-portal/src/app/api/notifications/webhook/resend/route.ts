// =============================================================================
// POST /api/notifications/webhook/resend — webhook de delivery tracking
// =============================================================================
//
// Recibe eventos de Resend (delivered/bounced/opened/etc.) y actualiza la
// fila correspondiente en `Notification`. Resend firma webhooks vía Svix.
//
// Configuración:
//   1. En Resend dashboard → Webhooks → Add endpoint
//      URL: https://portal.maxrent.cl/api/notifications/webhook/resend
//      Events: email.sent, email.delivered, email.bounced, email.complained,
//              email.opened, email.clicked, email.delivery_delayed
//   2. Resend devuelve un Signing Secret → guardarlo en
//      `RESEND_WEBHOOK_SECRET` (env var del portal en Vercel).
//
// Sin `RESEND_WEBHOOK_SECRET` configurada, el endpoint rechaza todas las
// llamadas con 401 (anti-replay y anti-spoof).
//
// Idempotencia: aplicar varias veces el mismo evento es seguro — el update
// es por providerMessageId y los campos quedan consistentes.
// =============================================================================

import { NextResponse, type NextRequest } from "next/server";
import { Webhook } from "svix";
import { applyDeliveryEvent, type DeliveryEvent } from "@/lib/services/notifications/delivery-tracker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ResendEventType =
  | "email.sent"
  | "email.delivered"
  | "email.bounced"
  | "email.complained"
  | "email.opened"
  | "email.clicked"
  | "email.delivery_delayed";

type ResendWebhookPayload = {
  type: ResendEventType;
  created_at: string;
  data: {
    email_id?: string;
    [k: string]: unknown;
  };
};

/** Mapea el shape de Resend a nuestro DeliveryEvent común. */
function toDeliveryEvent(
  payload: ResendWebhookPayload
): DeliveryEvent | null {
  const id = payload.data?.email_id;
  if (!id) return null;
  const occurredAt = new Date(payload.created_at);
  const type = (() => {
    switch (payload.type) {
      case "email.sent":
        return "sent" as const;
      case "email.delivered":
        return "delivered" as const;
      case "email.opened":
        return "opened" as const;
      case "email.clicked":
        return "clicked" as const;
      case "email.bounced":
        return "bounced" as const;
      case "email.complained":
        return "complained" as const;
      case "email.delivery_delayed":
        return "delivery_delayed" as const;
      default:
        return null;
    }
  })();
  if (!type) return null;
  return {
    providerMessageId: id,
    type,
    occurredAt,
    rawPayload: payload,
  };
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) {
    // Sin secret no validamos firma — rechazamos siempre por seguridad.
    return NextResponse.json(
      { error: "Webhook no configurado" },
      { status: 401 }
    );
  }

  // Headers que Svix envía (case-insensitive en Next request headers).
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Faltan headers de firma" },
      { status: 400 }
    );
  }

  // Body raw (Svix verifica sobre el string exacto que llegó, no el parseado).
  const rawBody = await req.text();

  let payload: ResendWebhookPayload;
  try {
    const wh = new Webhook(secret);
    payload = wh.verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ResendWebhookPayload;
  } catch (err) {
    console.error("/api/notifications/webhook/resend — verify failed", err);
    return NextResponse.json(
      { error: "Firma inválida" },
      { status: 401 }
    );
  }

  const event = toDeliveryEvent(payload);
  if (!event) {
    // Tipo no soportado o sin email_id; respondemos 200 igual para que
    // Resend no reintente indefinidamente.
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const res = await applyDeliveryEvent(event);
    if ("notFound" in res) {
      // El providerMessageId no matchea con ninguna Notification (ej. fila
      // borrada manualmente). Respondemos 200 para no acumular reintentos.
      return NextResponse.json({ ok: true, notFound: true });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("/api/notifications/webhook/resend — apply error", err);
    // 500 hace que Resend reintente automáticamente con backoff.
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
