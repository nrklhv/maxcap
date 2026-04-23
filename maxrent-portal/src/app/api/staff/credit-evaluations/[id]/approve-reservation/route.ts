/**
 * Staff: mark a completed credit evaluation as approved for investor reservations.
 * Symmetric undo: `POST .../revoke-reservation-approval` clears `staffReservationApprovedAt`.
 *
 * @source POST /api/staff/credit-evaluations/:id/approve-reservation
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
      { error: "Solo se pueden habilitar reservas para evaluaciones completadas (Floid)." },
      { status: 400 }
    );
  }
  if (row.staffReservationApprovedAt) {
    return NextResponse.json({ error: "Ya estaba habilitada" }, { status: 409 });
  }

  await prisma.creditEvaluation.update({
    where: { id: row.id },
    data: {
      staffReservationApprovedAt: new Date(),
      staffReservationApprovedByUserId: session.user.id,
    },
  });

  return NextResponse.json({ ok: true });
}
