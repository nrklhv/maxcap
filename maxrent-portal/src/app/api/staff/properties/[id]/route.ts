import { NextResponse } from "next/server";
import { requireStaffSuperAdmin } from "@/lib/api-auth";
import { propertyUpdateSchema } from "@/lib/validations";
import * as propertyService from "@/lib/services/property.service";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireStaffSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const parsed = propertyUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const updated = await propertyService.updateProperty(id, parsed.data);
    return NextResponse.json({ property: updated });
  } catch {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireStaffSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = params;
  try {
    await propertyService.deleteProperty(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });
  }
}
