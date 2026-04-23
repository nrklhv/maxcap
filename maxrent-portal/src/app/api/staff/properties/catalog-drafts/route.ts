import { NextResponse } from "next/server";
import { requireStaffSuperAdmin } from "@/lib/api-auth";
import * as propertyService from "@/lib/services/property.service";

/**
 * Lists catalog staging drafts (Houm + CSV) for staff (default: PENDING).
 *
 * @query status — optional `PENDING` | `REJECTED` | `APPROVED`
 */
export async function GET(req: Request) {
  const session = await requireStaffSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("status");
  const status =
    raw === "REJECTED" || raw === "APPROVED" || raw === "PENDING" ? raw : "PENDING";

  const drafts = await propertyService.listPropertyCatalogDraftsByStatus(status);
  return NextResponse.json({ drafts });
}
