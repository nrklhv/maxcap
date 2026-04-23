import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffSuperAdmin } from "@/lib/api-auth";
import * as sponsorBrokerService from "@/lib/services/sponsor-broker.service";

const bodySchema = z
  .object({ sponsorBrokerUserId: z.string().nullable().optional() })
  .transform((d) => ({
    sponsorBrokerUserId:
      d.sponsorBrokerUserId == null || String(d.sponsorBrokerUserId).trim() === ""
        ? null
        : String(d.sponsorBrokerUserId).trim(),
  }));

/**
 * Staff: assign, change, or clear the approved broker linked to an investor (`User.sponsorBrokerUserId`).
 *
 * @source PATCH /api/staff/investors/:id/sponsor-broker
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireStaffSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id: investorUserId } = params;
  if (!investorUserId) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const user = await sponsorBrokerService.setSponsorBrokerForInvestorByStaff({
      investorUserId,
      sponsorBrokerUserId: parsed.data.sponsorBrokerUserId,
      staffUserId: session.user.id!,
    });
    return NextResponse.json({ investor: user });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
