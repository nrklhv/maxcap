import { NextResponse } from "next/server";
import { requireApprovedBroker } from "@/lib/api-auth";
import * as propertyService from "@/lib/services/property.service";

export async function GET() {
  const session = await requireApprovedBroker();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!session.user.id) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const available = await propertyService.listBrokerDisponiblesProperties();

  return NextResponse.json({
    available,
    properties: available,
  });
}
