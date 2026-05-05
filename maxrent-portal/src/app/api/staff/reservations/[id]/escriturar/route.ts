/**
 * Staff: marca una reserva como escriturada (transición a CONFIRMED) y
 * dispara los payouts de atribución del usuario asociado:
 *   • Referral del referido (si existe) → SIGNED + payoutStatus PENDING.
 *   • BrokerLead del prospect (si existe) → CONTRACT_SIGNED + PENDING.
 *
 * Idempotente: si la reserva ya está CONFIRMED, NO vuelve a disparar payouts
 * (el service interno tampoco transiciona si ya está en estado terminal).
 *
 * @source POST /api/staff/reservations/:id/escriturar
 * @domain maxrent-portal / staff
 */

import { NextResponse } from "next/server";
import { requireStaffSuperAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  triggerEscrituraPayouts,
  safeRunReferralHook,
} from "@/lib/services/referral.service";

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
    select: { id: true, userId: true, status: true },
  });

  if (!reservation) {
    return NextResponse.json(
      { error: "Reserva no encontrada" },
      { status: 404 }
    );
  }

  // Sólo permitimos escriturar desde estados activos previos al CONFIRMED.
  // Si la reserva ya fue cancelada / expirada / reembolsada, error.
  const escriturableStatuses = ["PENDING_PAYMENT", "PAYMENT_PROCESSING", "PAID"];
  const alreadyEscriturada = reservation.status === "CONFIRMED";

  if (!alreadyEscriturada && !escriturableStatuses.includes(reservation.status)) {
    return NextResponse.json(
      {
        error: `No se puede escriturar una reserva en estado ${reservation.status}`,
      },
      { status: 400 }
    );
  }

  // Si no estaba CONFIRMED, transicionamos y disparamos payouts.
  if (!alreadyEscriturada) {
    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: "CONFIRMED" },
    });
  }

  // Disparar payouts (idempotente; si ya está en estado terminal, no-op).
  // Best-effort: si falla, NO revertimos la reserva — staff puede reintentar
  // manualmente con re-call al endpoint, o desde la futura UI de
  // /staff/atribuciones (PR 7).
  const payouts = await safeRunReferralHook("triggerEscrituraPayouts", () =>
    triggerEscrituraPayouts(reservation.userId)
  );

  return NextResponse.json({
    ok: true,
    reservationId: reservation.id,
    alreadyEscriturada,
    payouts: payouts ?? { referralId: null, brokerLeadId: null },
  });
}
