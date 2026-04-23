import { NextResponse } from "next/server";
import * as brokerInviteService from "@/lib/services/broker-investor-invite.service";

/**
 * Public: whether an invite token is currently usable (no auth).
 *
 * @source GET /api/public/broker-investor-invites/:token
 */
export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const { token } = params;
  if (!token) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }

  const valid = await brokerInviteService.validateBrokerInvestorInviteTokenPublic(token);
  if (!valid) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }
  return NextResponse.json({ valid: true });
}
