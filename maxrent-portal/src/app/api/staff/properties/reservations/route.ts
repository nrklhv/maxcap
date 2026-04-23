/**
 * Staff: active investor `Reservation` rows (inventory holds are via inversionistas only).
 *
 * @source GET /api/staff/properties/reservations
 * @domain maxrent-portal
 * @see listUnifiedStaffReservationsForStaff
 */

import { NextResponse } from "next/server";
import { requireStaffSuperAdmin } from "@/lib/api-auth";
import * as propertyService from "@/lib/services/property.service";

export async function GET() {
  const session = await requireStaffSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const rows = await propertyService.listUnifiedStaffReservationsForStaff();
  return NextResponse.json({ rows });
}
