// =============================================================================
// Payment Service — Integración con pasarela de pago
// =============================================================================
// STUB: Preparado para Mercado Pago o Stripe.
// Cuando elijas pasarela, instala el SDK correspondiente y reemplaza los stubs.
//
// Mercado Pago: npm install mercadopago
// Stripe:       npm install stripe
// =============================================================================

import { prisma } from "@/lib/prisma";
import { reconcilePropertyAfterInvestorReservationChange } from "@/lib/services/property.service";
import { reconcilePoolUnitAfterReservationChange } from "@/lib/services/pool.service";
import { notifyTemplate } from "@/lib/services/notifications";

export interface CheckoutResult {
  checkoutUrl: string;       // URL donde redirigir al usuario para pagar
  paymentExternalId: string; // ID de la preferencia/sesión de pago
}

export interface WebhookPayload {
  externalId: string;
  status: "approved" | "pending" | "rejected";
  paymentMethod?: string;
  paidAt?: string;
}

export class PaymentService {
  /**
   * Crear una sesión de checkout para una reserva.
   * Genera la URL de pago y la guarda en la reserva.
   */
  async createCheckout(reservationId: string, returnUrl: string): Promise<CheckoutResult> {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { user: { select: { email: true, name: true } } },
    });

    if (!reservation) throw new Error("Reserva no encontrada");
    if (reservation.status !== "PENDING_PAYMENT") {
      throw new Error("La reserva no está pendiente de pago");
    }

    // Crear preferencia de pago en la pasarela
    const result = await this.createPaymentPreference({
      title: `Reserva ${reservation.propertyName || reservation.propertyId}`,
      amount: Number(reservation.amount),
      currency: reservation.currency,
      externalReference: reservation.id,
      payerEmail: reservation.user.email,
      payerName: reservation.user.name || undefined,
      returnUrl,
    });

    // Guardar referencia de pago en la reserva
    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        paymentExternalId: result.paymentExternalId,
        paymentUrl: result.checkoutUrl,
        status: "PAYMENT_PROCESSING",
      },
    });
    // Una reserva referencia o `propertyId` (Producto 1) o `poolUnitId` (Producto 2)
    // pero nunca ambos (CHECK XOR). Llamamos los dos reconciliadores; el del lado
    // que no aplica es un no-op porque recibe null.
    await reconcilePropertyAfterInvestorReservationChange(updated.propertyId);
    await reconcilePoolUnitAfterReservationChange(updated.poolUnitId);

    return result;
  }

  /**
   * Procesar webhook de confirmación de pago.
   * La pasarela notifica cuando el pago fue aprobado/rechazado.
   */
  async handleWebhook(payload: WebhookPayload): Promise<void> {
    const reservation = await prisma.reservation.findFirst({
      where: { paymentExternalId: payload.externalId },
    });

    if (!reservation) {
      console.warn(`Webhook: reserva no encontrada para pago ${payload.externalId}`);
      return;
    }

    if (payload.status === "approved") {
      const after = await prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          status: "PAID",
          paymentMethod: payload.paymentMethod,
          paidAt: payload.paidAt ? new Date(payload.paidAt) : new Date(),
        },
      });
      await reconcilePropertyAfterInvestorReservationChange(after.propertyId);
      await reconcilePoolUnitAfterReservationChange(after.poolUnitId);

      // Email "reserva-pagada" — fire-and-forget. El webhook MP no debe
      // bloquearse si Resend falla; la reserva ya quedó PAID en BD.
      void sendReservaPagadaEmail(after.id).catch((err) => {
        console.error("[payment.webhook] reserva-pagada email falló", err);
      });

    } else if (payload.status === "rejected") {
      const after = await prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: "PENDING_PAYMENT" },
      });
      await reconcilePropertyAfterInvestorReservationChange(after.propertyId);
      await reconcilePoolUnitAfterReservationChange(after.poolUnitId);
    }
  }

  // =========================================================================
  // STUB — Reemplazar con Mercado Pago o Stripe
  // =========================================================================

  /**
   * TODO: Reemplazar con integración real.
   *
   * Ejemplo con Mercado Pago:
   * ```typescript
   * import { MercadoPagoConfig, Preference } from "mercadopago";
   *
   * const client = new MercadoPagoConfig({
   *   accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
   * });
   *
   * private async createPaymentPreference(params: PaymentParams) {
   *   const preference = new Preference(client);
   *   const result = await preference.create({
   *     body: {
   *       items: [{
   *         title: params.title,
   *         unit_price: params.amount,
   *         quantity: 1,
   *         currency_id: params.currency,
   *       }],
   *       payer: { email: params.payerEmail },
   *       external_reference: params.externalReference,
   *       back_urls: {
   *         success: `${params.returnUrl}?status=success`,
   *         failure: `${params.returnUrl}?status=failure`,
   *         pending: `${params.returnUrl}?status=pending`,
   *       },
   *       notification_url: `${process.env.NEXTAUTH_URL}/api/payments/webhook`,
   *       auto_return: "approved",
   *     },
   *   });
   *   return {
   *     checkoutUrl: result.init_point!,
   *     paymentExternalId: result.id!,
   *   };
   * }
   * ```
   */
  private async createPaymentPreference(params: {
    title: string;
    amount: number;
    currency: string;
    externalReference: string;
    payerEmail: string;
    payerName?: string;
    returnUrl: string;
  }): Promise<CheckoutResult> {
    // ⚠️ STUB: Simula creación de checkout
    console.log("[PaymentService STUB] Creating checkout for:", params.title);

    return {
      checkoutUrl: `https://checkout.example.com/pay/${params.externalReference}`,
      paymentExternalId: `stub_pay_${Date.now()}`,
    };
  }
}

export const paymentService = new PaymentService();

/**
 * Trae la reserva con datos suficientes para armar el email de confirmación
 * (user.email, profile.firstName, descripción legible de la unidad, monto).
 * Soporta los 2 productos (Property y PoolUnit) — XOR garantizado por el
 * CHECK constraint del schema.
 */
async function sendReservaPagadaEmail(reservationId: string): Promise<void> {
  const r = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      userId: true,
      propertyName: true,
      amount: true,
      currency: true,
      user: {
        select: {
          email: true,
          profile: { select: { firstName: true } },
        },
      },
      poolUnit: {
        select: {
          label: true,
          externalId: true,
          pool: { select: { name: true } },
        },
      },
    },
  });

  if (!r?.user?.email) return;

  // Descripción legible de la unidad para el body del email.
  let unitDescription = r.propertyName || "tu unidad";
  if (r.poolUnit) {
    unitDescription = `${r.poolUnit.label} (${r.poolUnit.pool.name})`;
  }

  const amountNumber = Number(r.amount);
  const amountClpFormatted = Number.isFinite(amountNumber)
    ? `$${Math.round(amountNumber).toLocaleString("es-CL")}`
    : "—";

  const portalUrl =
    process.env.NEXT_PUBLIC_PORTAL_URL?.trim() ||
    "https://portal.maxrent.cl";

  await notifyTemplate({
    template: "reserva-pagada",
    to: r.user.email,
    variables: {
      firstName: r.user.profile?.firstName ?? "",
      unitDescription,
      amountClpFormatted,
      portalUrl,
    },
    userId: r.userId,
  });
}
