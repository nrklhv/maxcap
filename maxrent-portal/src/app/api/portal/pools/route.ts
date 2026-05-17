/**
 * Investor portal: listado de pools publicados (Producto 2).
 *
 * Mismo gate que `/api/portal/catalog-properties`: la lista se devuelve siempre
 * a cualquier inversionista autenticado, pero `canReserve` controla si el
 * botón Reservar de cada unidad debe estar habilitado.
 *
 * @source GET /api/portal/pools
 * @domain portal
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getInvestorReserveGatePayload } from "@/lib/portal/investor-reservation-gate";
import { listPublicPools } from "@/lib/services/pool.service";
import { getLatestUfRate } from "@/lib/services/uf.service";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const limited = await applyRateLimit(req, RATE_LIMITS.authenticated, { route: "pools-list" });
  if (limited) return limited;

  const [gate, pools, latestUf] = await Promise.all([
    getInvestorReserveGatePayload(session.user.id),
    listPublicPools(),
    getLatestUfRate(),
  ]);

  return NextResponse.json({
    pools,
    canReserve: gate.canReserve,
    evaluationId: gate.evaluationId,
    reserveBlockReason: gate.reserveBlockReason,
    latestUfRate: latestUf
      ? { date: latestUf.date.toISOString().slice(0, 10), valueClp: latestUf.valueClp }
      : null,
  });
}
