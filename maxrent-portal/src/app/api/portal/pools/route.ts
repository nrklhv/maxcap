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

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const [gate, pools] = await Promise.all([
    getInvestorReserveGatePayload(session.user.id),
    listPublicPools(),
  ]);

  return NextResponse.json({
    pools,
    canReserve: gate.canReserve,
    evaluationId: gate.evaluationId,
    reserveBlockReason: gate.reserveBlockReason,
  });
}
