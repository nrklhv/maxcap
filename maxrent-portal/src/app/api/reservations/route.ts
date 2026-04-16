// =============================================================================
// API: /api/reservations
// GET  — Listar reservas del usuario
// POST — Crear nueva reserva
// =============================================================================

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reservationSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const reservations = await prisma.reservation.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      propertyId: true,
      propertyName: true,
      status: true,
      amount: true,
      currency: true,
      paymentMethod: true,
      paidAt: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  return NextResponse.json({ reservations });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const result = reservationSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Datos inválidos", errors: result.error.issues },
      { status: 400 }
    );
  }

  const { propertyId, evaluationId } = result.data;

  // Verificar que tiene una evaluación completada (opcional pero recomendado)
  if (evaluationId) {
    const evaluation = await prisma.creditEvaluation.findFirst({
      where: {
        id: evaluationId,
        userId: session.user.id,
        status: "COMPLETED",
      },
    });
    if (!evaluation) {
      return NextResponse.json(
        { error: "Evaluación no válida" },
        { status: 400 }
      );
    }
  }

  // Verificar que no tiene una reserva activa para la misma propiedad
  const existingReservation = await prisma.reservation.findFirst({
    where: {
      userId: session.user.id,
      propertyId,
      status: { in: ["PENDING_PAYMENT", "PAYMENT_PROCESSING", "PAID", "CONFIRMED"] },
    },
  });

  if (existingReservation) {
    return NextResponse.json(
      { error: "Ya tienes una reserva activa para esta propiedad" },
      { status: 409 }
    );
  }

  // TODO: Obtener monto de reserva desde catálogo de propiedades
  // Por ahora se recibe como parámetro o se usa un default
  const reservationAmount = body.amount || 500000; // 500.000 CLP default

  const reservation = await prisma.reservation.create({
    data: {
      userId: session.user.id,
      evaluationId,
      propertyId,
      propertyName: body.propertyName || null,
      amount: reservationAmount,
      currency: "CLP",
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // Expira en 48h
    },
  });

  return NextResponse.json({ reservation }, { status: 201 });
}
