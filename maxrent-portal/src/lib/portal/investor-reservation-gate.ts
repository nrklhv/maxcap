/**
 * Investor “Reservar” gate: latest credit evaluation must be COMPLETED (Floid) and
 * approved by staff (`staffReservationApprovedAt`).
 *
 * @domain portal
 * @see GET /api/portal/catalog-properties
 * @see POST /api/reservations
 */

import { prisma } from "@/lib/prisma";

export type ReserveBlockReason = "NO_EVAL" | "EVAL_NOT_COMPLETED" | "PENDING_STAFF_APPROVAL";

export type InvestorReserveGatePayload = {
  canReserve: boolean;
  evaluationId: string | null;
  reserveBlockReason: ReserveBlockReason | null;
};

/**
 * Loads the investor’s latest evaluation by `requestedAt` and derives whether
 * they may create a catalog reservation with that evaluation id.
 */
export async function getInvestorReserveGatePayload(
  userId: string
): Promise<InvestorReserveGatePayload> {
  const latest = await prisma.creditEvaluation.findFirst({
    where: { userId },
    orderBy: { requestedAt: "desc" },
    select: {
      id: true,
      status: true,
      staffReservationApprovedAt: true,
    },
  });

  if (!latest) {
    return {
      canReserve: false,
      evaluationId: null,
      reserveBlockReason: "NO_EVAL",
    };
  }

  if (latest.status !== "COMPLETED") {
    return {
      canReserve: false,
      evaluationId: null,
      reserveBlockReason: "EVAL_NOT_COMPLETED",
    };
  }

  if (!latest.staffReservationApprovedAt) {
    return {
      canReserve: false,
      evaluationId: null,
      reserveBlockReason: "PENDING_STAFF_APPROVAL",
    };
  }

  return {
    canReserve: true,
    evaluationId: latest.id,
    reserveBlockReason: null,
  };
}
