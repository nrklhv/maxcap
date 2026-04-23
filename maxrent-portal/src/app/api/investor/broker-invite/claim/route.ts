import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCanInvestUser } from "@/lib/api-auth";
import * as brokerInviteService from "@/lib/services/broker-investor-invite.service";

const BodySchema = z.object({
  token: z.string().min(1),
});

/**
 * Logged-in investor: consume pending invite token from sessionStorage flow.
 *
 * @source POST /api/investor/broker-invite/claim
 */
export async function POST(req: Request) {
  const session = await requireCanInvestUser();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Token requerido" }, { status: 400 });
  }

  try {
    const result = await brokerInviteService.claimBrokerInvestorInviteForInvestor({
      token: parsed.data.token,
      investorUserId: session.user.id,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo vincular la invitación.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
