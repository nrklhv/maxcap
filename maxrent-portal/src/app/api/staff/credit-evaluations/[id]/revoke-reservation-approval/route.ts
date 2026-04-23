/**
 * Staff: clears reservation gate on a completed credit evaluation (undo «Habilitar reservas»).
 * Does not cancel existing `Reservation` rows; it only blocks new catalog reservations until
 * staff enables again (see `getInvestorReserveGatePayload`).
 *
 * @source POST /api/staff/credit-evaluations/:id/revoke-reservation-approval
 * @domain staff
 */

import { NextResponse } from "next/server";
import { requireStaffSuperAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireStaffSuperAdmin();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  const row = await prisma.creditEvaluation.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      staffReservationApprovedAt: true,
    },
  });

  if (!row) {
    return NextResponse.json({ error: "Evaluación no encontrada" }, { status: 404 });
  }
  if (row.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "Solo se puede revocar la habilitación sobre evaluaciones completadas (Floid)." },
      { status: 400 }
    );
  }
  if (!row.staffReservationApprovedAt) {
    return NextResponse.json(
      { error: "Esta evaluación no tiene habilitación de reservas para revocar." },
      { status: 400 }
    );
  }

  await prisma.creditEvaluation.update({
    where: { id: row.id },
    data: {
      staffReservationApprovedAt: null,
      staffReservationApprovedByUserId: null,
    },
  });

  return NextResponse.json({ ok: true });
}
