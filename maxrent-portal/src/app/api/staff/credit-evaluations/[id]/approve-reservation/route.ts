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
import { notifyTemplate } from "@/lib/services/notifications";

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
      userId: true,
      user: {
        select: {
          email: true,
          profile: { select: { firstName: true } },
        },
      },
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

  // Email "habilitacion-aprobada" — fire-and-forget. Si Resend falla, la
  // habilitación queda igual en BD; staff puede reenviar manualmente desde la
  // vista de comunicaciones (PR B).
  if (row.user?.email) {
    const portalUrl =
      process.env.NEXT_PUBLIC_PORTAL_URL?.trim() ||
      "https://portal.maxrent.cl";
    void notifyTemplate({
      template: "habilitacion-aprobada",
      to: row.user.email,
      variables: {
        firstName: row.user.profile?.firstName ?? "",
        portalUrl,
      },
      userId: row.userId,
    }).catch((err) => {
      console.error("[approve-reservation] notifyTemplate falló", err);
    });
  }

  return NextResponse.json({ ok: true });
}
