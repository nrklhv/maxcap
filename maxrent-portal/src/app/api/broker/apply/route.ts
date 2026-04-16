import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import * as brokerService from "@/lib/services/broker.service";

export async function POST() {
  const session = await requireUser();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const user = await brokerService.requestBrokerAccess(session.user.id);
    return NextResponse.json({
      ok: true,
      brokerAccessStatus: user.brokerAccessStatus,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
