/**
 * Investor portal: detalle de un pool + grilla de unidades.
 *
 * Devuelve **solo** campos públicos de `PoolUnit` (sin `internalData`, que tiene
 * dirección exacta y datos sensibles). Si el pool es `DRAFT` o no existe → 404.
 *
 * También indica al cliente cuáles unidades tienen una reserva activa del
 * propio usuario, para marcarlas en la grilla.
 *
 * @source GET /api/portal/pools/[slug]
 * @domain portal
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INVESTOR_ACTIVE_RESERVATION_STATUSES } from "@/lib/portal/investor-active-reservation-statuses";
import { getInvestorReserveGatePayload } from "@/lib/portal/investor-reservation-gate";
import {
  getPublicPoolBySlug,
  listPublicPoolUnits,
} from "@/lib/services/pool.service";

export async function GET(_: Request, { params }: { params: { slug: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const pool = await getPublicPoolBySlug(params.slug);
  if (!pool) {
    return NextResponse.json({ error: "Pool no encontrado" }, { status: 404 });
  }

  const [gate, units, activeReservations] = await Promise.all([
    getInvestorReserveGatePayload(session.user.id),
    listPublicPoolUnits(pool.id),
    prisma.reservation.findMany({
      where: {
        userId: session.user.id,
        status: { in: [...INVESTOR_ACTIVE_RESERVATION_STATUSES] },
        poolUnitId: { not: null },
      },
      select: { poolUnitId: true },
    }),
  ]);

  const userReservedUnitIds = new Set(
    activeReservations
      .map((r) => r.poolUnitId)
      .filter((id): id is string => id !== null)
  );

  const unitsWithFlag = units.map((u) => ({
    ...u,
    investorHasActiveReservation: userReservedUnitIds.has(u.id),
  }));

  return NextResponse.json({
    pool,
    units: unitsWithFlag,
    canReserve: gate.canReserve,
    evaluationId: gate.evaluationId,
    reserveBlockReason: gate.reserveBlockReason,
  });
}
