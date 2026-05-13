/**
 * Staff: listado de pools (Producto 2).
 *
 * @source GET /api/staff/pools
 * @domain maxrent-portal / staff
 */

import { NextResponse } from "next/server";
import { requireStaffSuperAdmin } from "@/lib/api-auth";
import { listStaffPools } from "@/lib/services/pool.service";

export async function GET() {
  const session = await requireStaffSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const pools = await listStaffPools();
  // Serializamos Decimals como strings (igual que las APIs públicas).
  const serialized = pools.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    status: p.status,
    acceptingReservations: p.acceptingReservations,
    capRateBruto: p.capRateBruto.toString(),
    reservationFeeClp: p.reservationFeeClp.toString(),
    totalUnits: p.totalUnits,
    totalValueUf: p.totalValueUf ? p.totalValueUf.toString() : null,
    totalMonthlyRentClp: p.totalMonthlyRentClp ? p.totalMonthlyRentClp.toString() : null,
    occupancyPct: p.occupancyPct,
  }));
  return NextResponse.json({ pools: serialized });
}
