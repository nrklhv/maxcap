// =============================================================================
// API: POST /api/payments/webhook
// Webhook de la pasarela de pago (Mercado Pago / Stripe)
// =============================================================================
// NOTA: Este endpoint NO requiere autenticación de usuario.
// La pasarela de pago lo llama directamente.
// Se debe validar que la petición viene de la pasarela (firma/secret).
// =============================================================================

import { NextResponse } from "next/server";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
// import { paymentService } from "@/lib/services/payment.service"; // al integrar MP/Stripe

export async function POST(req: Request) {
  // Bucket "webhook" (60/min por IP). MP envía bursts legítimos: este límite es
  // amplio para no perder eventos, pero corta abuso desde IPs anónimas.
  const limited = await applyRateLimit(req, RATE_LIMITS.webhook, { route: "payments" });
  if (limited) return limited;

  try {
    const body = await req.json();

    // TODO: Validar firma del webhook según la pasarela elegida
    //
    // Mercado Pago:
    //   const signature = req.headers.get("x-signature");
    //   if (!verifyMercadoPagoSignature(signature, body)) {
    //     return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    //   }
    //
    // Stripe:
    //   const signature = req.headers.get("stripe-signature");
    //   const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    // TODO: Mapear el payload de la pasarela al formato interno
    // Este mapping depende de la pasarela que elijas

    // Ejemplo para Mercado Pago:
    // if (body.type === "payment") {
    //   const paymentId = body.data.id;
    //   const payment = await mercadopago.payment.get(paymentId);
    //   await paymentService.handleWebhook({
    //     externalId: payment.external_reference,
    //     status: payment.status === "approved" ? "approved" : "rejected",
    //     paymentMethod: payment.payment_method_id,
    //     paidAt: payment.date_approved,
    //   });
    // }

    console.log("[Webhook] Received:", JSON.stringify(body).slice(0, 200));

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Webhook Error]", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
