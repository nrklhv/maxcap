import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffSuperAdmin } from "@/lib/api-auth";
import * as brokerService from "@/lib/services/broker.service";

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

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
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Acción inválida", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    if (parsed.data.action === "approve") {
      const user = await brokerService.approveBroker(id);
      return NextResponse.json({ broker: user });
    }
    const user = await brokerService.rejectBroker(id);
    return NextResponse.json({ broker: user });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
