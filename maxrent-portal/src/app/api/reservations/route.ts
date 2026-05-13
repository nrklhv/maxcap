// =============================================================================
// API: /api/reservations
// GET  — Listar reservas del usuario (Producto 1 + Producto 2)
// POST — Crear nueva reserva (XOR: propertyId | poolUnitId)
// =============================================================================

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INVESTOR_ACTIVE_RESERVATION_STATUSES } from "@/lib/portal/investor-active-reservation-statuses";
import { getInvestorReserveGatePayload } from "@/lib/portal/investor-reservation-gate";
import { reservationSchema } from "@/lib/validations";
import * as propertyService from "@/lib/services/property.service";
import * as poolService from "@/lib/services/pool.service";

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
      poolUnitId: true,
      status: true,
      amount: true,
      currency: true,
      paymentMethod: true,
      paymentUrl: true,
      paidAt: true,
      createdAt: true,
      expiresAt: true,
      poolUnit: {
        select: {
          id: true,
          externalId: true,
          label: true,
          pool: { select: { slug: true, name: true } },
        },
      },
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
  const parsed = reservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", errors: parsed.error.issues },
      { status: 400 }
    );
  }

  const { propertyId, poolUnitId, evaluationId: evaluationIdFromBody } = parsed.data;

  const gate = await getInvestorReserveGatePayload(session.user.id);
  if (!gate.canReserve || !gate.evaluationId) {
    return NextResponse.json(
      { error: "No tienes habilitado reservar. Completa la evaluación y espera la aprobación del equipo." },
      { status: 403 }
    );
  }
  if (evaluationIdFromBody && evaluationIdFromBody !== gate.evaluationId) {
    return NextResponse.json({ error: "Evaluación no válida" }, { status: 400 });
  }
  const evaluationIdToUse = gate.evaluationId;

  try {
    if (propertyId) {
      const reservation = await createPropertyReservation({
        tx: prisma,
        userId: session.user.id,
        propertyId,
        evaluationId: evaluationIdToUse,
        propertyNameHint: typeof body.propertyName === "string" ? body.propertyName : null,
        amountFromBody: typeof body.amount === "number" ? body.amount : undefined,
      });
      return NextResponse.json({ reservation }, { status: 201 });
    }

    if (poolUnitId) {
      const reservation = await createPoolUnitReservation({
        userId: session.user.id,
        poolUnitId,
        evaluationId: evaluationIdToUse,
      });
      return NextResponse.json({ reservation }, { status: 201 });
    }

    // Defensivo: el schema ya garantiza XOR.
    return NextResponse.json({ error: "Falta target de reserva" }, { status: 400 });
  } catch (e) {
    return mapReservationErrorToResponse(e);
  }
}

// ============================================================================
// Rama Producto 1 — Property
// ============================================================================

async function createPropertyReservation(opts: {
  tx: typeof prisma;
  userId: string;
  propertyId: string;
  evaluationId: string;
  propertyNameHint: string | null;
  amountFromBody: number | undefined;
}) {
  // TODO(catalog): el monto de reserva debería salir del catálogo de Property.
  const reservationAmount = opts.amountFromBody ?? 500000;

  return opts.tx.$transaction(async (tx) => {
    const prop = await tx.property.findFirst({
      where: { id: opts.propertyId, status: "AVAILABLE", visibleToBrokers: true },
    });

    if (!prop) {
      const p = await tx.property.findUnique({ where: { id: opts.propertyId } });
      if (!p) throw new Error("NOT_FOUND");
      if (!p.visibleToBrokers) throw new Error("NOT_PUBLISHED");
      throw new Error("NOT_AVAILABLE");
    }

    const anyActiveOnProperty = await tx.reservation.findFirst({
      where: {
        propertyId: opts.propertyId,
        status: { in: [...INVESTOR_ACTIVE_RESERVATION_STATUSES] },
      },
    });
    if (anyActiveOnProperty) throw new Error("PROPERTY_HELD");

    const existingSelf = await tx.reservation.findFirst({
      where: {
        userId: opts.userId,
        propertyId: opts.propertyId,
        status: { in: [...INVESTOR_ACTIVE_RESERVATION_STATUSES] },
      },
    });
    if (existingSelf) throw new Error("DUPLICATE_SELF");

    const created = await tx.reservation.create({
      data: {
        userId: opts.userId,
        evaluationId: opts.evaluationId,
        propertyId: opts.propertyId,
        propertyName: opts.propertyNameHint,
        amount: reservationAmount,
        currency: "CLP",
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });

    await propertyService.markPropertyReservedForInvestorSync(tx, opts.propertyId, created);
    return created;
  });
}

// ============================================================================
// Rama Producto 2 — PoolUnit
// ============================================================================

async function createPoolUnitReservation(opts: {
  userId: string;
  poolUnitId: string;
  evaluationId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const unit = await tx.poolUnit.findUnique({
      where: { id: opts.poolUnitId },
      include: { pool: true },
    });
    if (!unit) throw new Error("NOT_FOUND");
    if (unit.pool.status !== "OPEN") throw new Error("POOL_CLOSED");
    if (!unit.pool.acceptingReservations) throw new Error("POOL_NOT_ACCEPTING");
    if (unit.saleStatus === "SOLD") throw new Error("UNIT_SOLD");
    if (unit.saleStatus === "RESERVED") throw new Error("UNIT_HELD");

    // ¿Hay alguna reserva activa ya (defensa adicional al saleStatus)?
    const anyActiveOnUnit = await tx.reservation.findFirst({
      where: {
        poolUnitId: opts.poolUnitId,
        status: { in: [...INVESTOR_ACTIVE_RESERVATION_STATUSES] },
      },
    });
    if (anyActiveOnUnit) throw new Error("UNIT_HELD");

    const existingSelf = await tx.reservation.findFirst({
      where: {
        userId: opts.userId,
        poolUnitId: opts.poolUnitId,
        status: { in: [...INVESTOR_ACTIVE_RESERVATION_STATUSES] },
      },
    });
    if (existingSelf) throw new Error("DUPLICATE_SELF");

    const amount = Number(unit.pool.reservationFeeClp);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("POOL_RESERVATION_FEE_INVALID");
    }

    // `propertyName` lo dejamos null porque el CHECK XOR exige propertyId=null
    // y este campo se usa solo como snapshot del título de la propiedad.
    const created = await tx.reservation.create({
      data: {
        userId: opts.userId,
        evaluationId: opts.evaluationId,
        poolUnitId: opts.poolUnitId,
        amount,
        currency: "CLP",
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });

    await poolService.markPoolUnitReservedSync(tx, opts.poolUnitId);
    return created;
  });
}

// ============================================================================
// Mapeo común de errores → HTTP
// ============================================================================

function mapReservationErrorToResponse(e: unknown): NextResponse {
  const code = e instanceof Error ? e.message : "";
  switch (code) {
    case "NOT_FOUND":
      return NextResponse.json({ error: "No se encontró la unidad o propiedad" }, { status: 404 });
    case "NOT_PUBLISHED":
      return NextResponse.json({ error: "La propiedad no está publicada" }, { status: 403 });
    case "POOL_CLOSED":
      return NextResponse.json({ error: "Este portafolio está cerrado" }, { status: 409 });
    case "POOL_NOT_ACCEPTING":
      return NextResponse.json(
        { error: "Este portafolio no acepta reservas en este momento" },
        { status: 409 }
      );
    case "UNIT_SOLD":
      return NextResponse.json({ error: "Esta unidad ya está vendida" }, { status: 409 });
    case "UNIT_HELD":
    case "PROPERTY_HELD":
      return NextResponse.json(
        {
          error:
            code === "UNIT_HELD"
              ? "Esta unidad ya tiene una reserva activa"
              : "Esta propiedad ya tiene una reserva activa",
        },
        { status: 409 }
      );
    case "NOT_AVAILABLE":
      return NextResponse.json(
        { error: "La propiedad no está disponible para reservar" },
        { status: 409 }
      );
    case "DUPLICATE_SELF":
      return NextResponse.json(
        { error: "Ya tienes una reserva activa para este ítem" },
        { status: 409 }
      );
    case "POOL_RESERVATION_FEE_INVALID":
      return NextResponse.json(
        { error: "El portafolio no tiene un monto de reserva válido configurado" },
        { status: 500 }
      );
    default:
      console.error("[POST /api/reservations]", e);
      return NextResponse.json({ error: "No se pudo crear la reserva" }, { status: 500 });
  }
}
