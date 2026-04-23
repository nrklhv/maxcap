/**
 * Staff: list active investor reservations (`Reservation` rows from portal inversionista).
 *
 * @source GET /api/staff/reservations
 * @domain maxrent-portal
 * @see ReservationStatus
 */

import { NextResponse } from "next/server";
import { requireStaffSuperAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const ACTIVE_INVESTOR_RESERVATION_STATUSES = [
  "PENDING_PAYMENT",
  "PAYMENT_PROCESSING",
  "PAID",
  "CONFIRMED",
] as const;

export async function GET() {
  const session = await requireStaffSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const rows = await prisma.reservation.findMany({
    where: { status: { in: [...ACTIVE_INVESTOR_RESERVATION_STATUSES] } },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });

  const reservations = rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    propertyId: r.propertyId,
    propertyName: r.propertyName,
    status: r.status,
    amount: r.amount.toString(),
    currency: r.currency,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt?.toISOString() ?? null,
    paidAt: r.paidAt?.toISOString() ?? null,
    evaluationId: r.evaluationId,
    user: r.user,
  }));

  return NextResponse.json({ reservations });
}
