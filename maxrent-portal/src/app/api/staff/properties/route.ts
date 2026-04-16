import { NextResponse } from "next/server";
import { requireStaffSuperAdmin } from "@/lib/api-auth";
import { propertyCreateSchema } from "@/lib/validations";
import * as propertyService from "@/lib/services/property.service";

export async function GET() {
  const session = await requireStaffSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const items = await propertyService.listPropertiesForAdmin();
  return NextResponse.json({ properties: items });
}

export async function POST(req: Request) {
  const session = await requireStaffSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = propertyCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const created = await propertyService.createProperty({
    title: parsed.data.title,
    status: parsed.data.status,
    visibleToBrokers: parsed.data.visibleToBrokers,
    metadata: parsed.data.metadata ?? undefined,
  });

  return NextResponse.json({ property: created });
}
