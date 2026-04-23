import { NextResponse } from "next/server";
import { requireApprovedBroker } from "@/lib/api-auth";
import * as propertyService from "@/lib/services/property.service";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireApprovedBroker();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const userId = session.user.id;
  if (!userId) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const { id } = params;
  const property = await propertyService.getPropertyForBroker(id, userId);
  if (!property) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  return NextResponse.json({ property });
}
