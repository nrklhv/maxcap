/**
 * Investor portal: detalle de una unidad individual del pool para la página de
 * checkout `/reserva/pool-unit/[id]`. Devuelve unit + summary del pool (slug,
 * name, monto de reserva) **sin** `internalData`.
 *
 * @source GET /api/portal/pool-units/[id]
 * @domain portal
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INVESTOR_ACTIVE_RESERVATION_STATUSES } from "@/lib/portal/investor-active-reservation-statuses";
import { getInvestorReserveGatePayload } from "@/lib/portal/investor-reservation-gate";
import { getPublicPoolUnitWithPool } from "@/lib/services/pool.service";
import { getLatestUfRate } from "@/lib/services/uf.service";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const limited = await applyRateLimit(req, RATE_LIMITS.authenticated, { route: "pool-unit" });
  if (limited) return limited;

  const data = await getPublicPoolUnitWithPool(params.id);
  if (!data) {
    return NextResponse.json({ error: "Unidad no encontrada" }, { status: 404 });
  }

  const [gate, investorReservation, latestUf] = await Promise.all([
    getInvestorReserveGatePayload(session.user.id),
    prisma.reservation.findFirst({
      where: {
        userId: session.user.id,
        poolUnitId: params.id,
        status: { in: [...INVESTOR_ACTIVE_RESERVATION_STATUSES] },
      },
      select: { id: true, status: true },
    }),
    getLatestUfRate(),
  ]);

  return NextResponse.json({
    unit: data.unit,
    pool: data.pool,
    canReserve: gate.canReserve,
    evaluationId: gate.evaluationId,
    reserveBlockReason: gate.reserveBlockReason,
    investorActiveReservation: investorReservation, // { id, status } o null
    // UF actual cacheada — UI calcula "≈ $X CLP" con esto. Null si todavía
    // no hubo cron (caso muy temprano post-deploy).
    latestUfRate: latestUf
      ? {
          date: latestUf.date.toISOString().slice(0, 10),
          valueClp: latestUf.valueClp,
        }
      : null,
  });
}
