import { NextResponse } from "next/server";
import { requireStaffSuperAdmin } from "@/lib/api-auth";
import * as propertyService from "@/lib/services/property.service";

/**
 * Promotes a pending catalog draft (Houm or CSV) to an official `Property`.
 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireStaffSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const userId = session.user.id;
  if (!userId) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const { id } = params;

  try {
    const result = await propertyService.approvePropertyCatalogDraft(id, userId);
    return NextResponse.json({
      ok: true,
      property: result.property,
      draft: result.draft,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al aprobar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
