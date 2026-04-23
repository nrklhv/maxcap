/**
 * Staff: cancel an investor reservation and reconcile `Property` inventory.
 * Allowed for any previously active investor status (including PAID/CONFIRMED) — staff inventory release.
 *
 * @source POST /api/staff/reservations/:id/cancel
 * @domain maxrent-portal
 */

import { NextResponse } from "next/server";
import { requireStaffSuperAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { INVESTOR_ACTIVE_RESERVATION_STATUSES } from "@/lib/portal/investor-active-reservation-statuses";
import { reconcilePropertyAfterInvestorReservationChange } from "@/lib/services/property.service";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireStaffSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: id.trim() },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  }

  const activeStatuses = [...INVESTOR_ACTIVE_RESERVATION_STATUSES] as string[];
  if (!activeStatuses.includes(reservation.status)) {
    return NextResponse.json(
      { error: "La reserva no está en un estado cancelable desde esta vista" },
      { status: 400 }
    );
  }

  await prisma.reservation.update({
    where: { id: reservation.id },
    data: { status: "CANCELLED" },
  });

  await reconcilePropertyAfterInvestorReservationChange(reservation.propertyId);

  return NextResponse.json({ ok: true });
}
