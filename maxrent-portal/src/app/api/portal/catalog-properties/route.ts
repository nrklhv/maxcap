/**
 * Investor portal: published catalog (same inventory as broker "Disponibles").
 * List is always returned for authenticated users; reserving requires a completed evaluation
 * (`canReserve` / `evaluationId` on the response).
 *
 * @source GET /api/portal/catalog-properties
 * @domain portal
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INVESTOR_ACTIVE_RESERVATION_STATUSES } from "@/lib/portal/investor-active-reservation-statuses";
import { getInvestorReserveGatePayload } from "@/lib/portal/investor-reservation-gate";
import * as propertyService from "@/lib/services/property.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const [gate, properties, activeReservationRows] = await Promise.all([
    getInvestorReserveGatePayload(session.user.id),
    propertyService.listInvestorCatalogProperties(session.user.id),
    prisma.reservation.findMany({
      where: {
        userId: session.user.id,
        status: { in: [...INVESTOR_ACTIVE_RESERVATION_STATUSES] },
      },
      select: { propertyId: true },
    }),
  ]);

  const canReserve = gate.canReserve;
  const evaluationId = gate.evaluationId;
  const reserveBlockReason = gate.reserveBlockReason;

  const reservedPropertyIds = new Set(activeReservationRows.map((r) => r.propertyId));

  const rows = properties.map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    metadata: p.metadata,
    houmPropertyId: p.houmPropertyId,
    inventoryCode: p.inventoryCode,
    visibleToBrokers: p.visibleToBrokers,
    investorHasActiveReservation: reservedPropertyIds.has(p.id),
  }));

  return NextResponse.json({
    properties: rows,
    canReserve,
    evaluationId,
    reserveBlockReason,
  });
}
