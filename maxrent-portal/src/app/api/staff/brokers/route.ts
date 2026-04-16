import { NextResponse } from "next/server";
import { requireStaffSuperAdmin } from "@/lib/api-auth";
import * as brokerService from "@/lib/services/broker.service";

export async function GET() {
  const session = await requireStaffSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const brokers = await brokerService.listBrokerUsers();
  return NextResponse.json({ brokers });
}
