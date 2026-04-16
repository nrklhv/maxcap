// =============================================================================
// API: POST /api/payments/checkout
// Generar URL de checkout para una reserva pendiente de pago
// =============================================================================

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { paymentService } from "@/lib/services/payment.service";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { reservationId } = await req.json();

  if (!reservationId) {
    return NextResponse.json({ error: "reservationId es requerido" }, { status: 400 });
  }

  // Verificar que la reserva pertenece al usuario
  const reservation = await prisma.reservation.findFirst({
    where: {
      id: reservationId,
      userId: session.user.id,
    },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  }

  if (reservation.status !== "PENDING_PAYMENT") {
    return NextResponse.json(
      { error: "La reserva no está pendiente de pago" },
      { status: 400 }
    );
  }

  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const result = await paymentService.createCheckout(
      reservationId,
      `${baseUrl}/reserva`
    );

    return NextResponse.json({
      checkoutUrl: result.checkoutUrl,
    });
  } catch (error) {
    console.error("[Payment Checkout]", error);
    return NextResponse.json(
      { error: "Error al crear sesión de pago" },
      { status: 500 }
    );
  }
}
