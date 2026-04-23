// =============================================================================
// API: /api/reservations
// GET  — Listar reservas del usuario
// POST — Crear nueva reserva
// =============================================================================

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INVESTOR_ACTIVE_RESERVATION_STATUSES } from "@/lib/portal/investor-active-reservation-statuses";
import { getInvestorReserveGatePayload } from "@/lib/portal/investor-reservation-gate";
import { reservationSchema } from "@/lib/validations";
import * as propertyService from "@/lib/services/property.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const reservations = await prisma.reservation.findMany({
    where: {
      userId: session.user.id,
      status: { in: [...INVESTOR_ACTIVE_RESERVATION_STATUSES] },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      propertyId: true,
      propertyName: true,
      status: true,
      amount: true,
      currency: true,
      paymentMethod: true,
      paymentUrl: true,
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

  const { propertyId, evaluationId: evaluationIdFromBody } = result.data;

  const gate = await getInvestorReserveGatePayload(session.user.id);
  if (!gate.canReserve || !gate.evaluationId) {
    return NextResponse.json(
      { error: "No tenés habilitado reservar. Completá la evaluación y esperá la aprobación del equipo." },
      { status: 403 }
    );
  }
  if (evaluationIdFromBody && evaluationIdFromBody !== gate.evaluationId) {
    return NextResponse.json({ error: "Evaluación no válida" }, { status: 400 });
  }
  const evaluationIdToUse = gate.evaluationId;

  // TODO: Obtener monto de reserva desde catálogo de propiedades
  // Por ahora se recibe como parámetro o se usa un default
  const reservationAmount = body.amount || 500000; // 500.000 CLP default

  try {
    const reservation = await prisma.$transaction(async (tx) => {
      const prop = await tx.property.findFirst({
        where: {
          id: propertyId,
          status: "AVAILABLE",
          visibleToBrokers: true,
        },
      });

      if (!prop) {
        const p = await tx.property.findUnique({ where: { id: propertyId } });
        if (!p) {
          throw new Error("NOT_FOUND");
        }
        if (!p.visibleToBrokers) {
          throw new Error("NOT_PUBLISHED");
        }
        throw new Error("NOT_AVAILABLE");
      }

      const anyActiveOnProperty = await tx.reservation.findFirst({
        where: {
          propertyId,
          status: { in: [...INVESTOR_ACTIVE_RESERVATION_STATUSES] },
        },
      });
      if (anyActiveOnProperty) {
        throw new Error("PROPERTY_HELD");
      }

      const existingReservation = await tx.reservation.findFirst({
        where: {
          userId: session.user.id,
          propertyId,
          status: { in: [...INVESTOR_ACTIVE_RESERVATION_STATUSES] },
        },
      });
      if (existingReservation) {
        throw new Error("DUPLICATE_SELF");
      }

      const created = await tx.reservation.create({
        data: {
          userId: session.user.id,
          evaluationId: evaluationIdToUse,
          propertyId,
          propertyName: body.propertyName || null,
          amount: reservationAmount,
          currency: "CLP",
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // Expira en 48h
        },
      });

      await propertyService.markPropertyReservedForInvestorSync(tx, propertyId, created);
      return created;
    });

    return NextResponse.json({ reservation }, { status: 201 });
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "NOT_FOUND") {
      return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });
    }
    if (code === "NOT_PUBLISHED") {
      return NextResponse.json({ error: "Propiedad no publicada" }, { status: 403 });
    }
    if (code === "NOT_AVAILABLE" || code === "PROPERTY_HELD") {
      return NextResponse.json(
        {
          error:
            code === "PROPERTY_HELD"
              ? "Esta propiedad ya tiene una reserva activa"
              : "La propiedad no está disponible para reservar",
        },
        { status: 409 }
      );
    }
    if (code === "DUPLICATE_SELF") {
      return NextResponse.json(
        { error: "Ya tienes una reserva activa para esta propiedad" },
        { status: 409 }
      );
    }
    console.error("[POST /api/reservations]", e);
    return NextResponse.json({ error: "No se pudo crear la reserva" }, { status: 500 });
  }
}
