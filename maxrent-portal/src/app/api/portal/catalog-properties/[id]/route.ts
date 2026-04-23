/**
 * Single property from the investor catalog (published + available only).
 * Readable for any authenticated user; `canReserve` indicates if POST /api/reservations is allowed.
 *
 * @source GET /api/portal/catalog-properties/:id
 * @domain portal
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INVESTOR_ACTIVE_RESERVATION_STATUSES } from "@/lib/portal/investor-active-reservation-statuses";
import { getInvestorReserveGatePayload } from "@/lib/portal/investor-reservation-gate";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  const [gate, property, activeReservation] = await Promise.all([
    getInvestorReserveGatePayload(session.user.id),
    prisma.property.findFirst({
      where: {
        id,
        visibleToBrokers: true,
      },
    }),
    prisma.reservation.findFirst({
      where: {
        userId: session.user.id,
        propertyId: id,
        status: { in: [...INVESTOR_ACTIVE_RESERVATION_STATUSES] },
      },
      select: { id: true },
    }),
  ]);

  if (!property) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  const canReadReserved =
    property.status === "RESERVED" && activeReservation != null;
  if (property.status !== "AVAILABLE" && !canReadReserved) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  const canReserve = gate.canReserve;
  const evaluationId = gate.evaluationId;
  const reserveBlockReason = gate.reserveBlockReason;
  const investorHasActiveReservation = activeReservation != null;

  return NextResponse.json({
    property: {
      id: property.id,
      title: property.title,
      status: property.status,
      metadata: property.metadata,
      houmPropertyId: property.houmPropertyId,
      inventoryCode: property.inventoryCode,
    },
    canReserve,
    evaluationId,
    reserveBlockReason,
    investorHasActiveReservation,
  });
}
