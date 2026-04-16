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
    await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        paymentExternalId: result.paymentExternalId,
        paymentUrl: result.checkoutUrl,
        status: "PAYMENT_PROCESSING",
      },
    });

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
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          status: "PAID",
          paymentMethod: payload.paymentMethod,
          paidAt: payload.paidAt ? new Date(payload.paidAt) : new Date(),
        },
      });

      // TODO: Enviar email de confirmación
      // await notificationService.sendReservationConfirmation(reservation.id);

    } else if (payload.status === "rejected") {
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: "PENDING_PAYMENT" },
      });
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
