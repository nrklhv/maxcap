import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApprovedBroker } from "@/lib/api-auth";
import * as brokerInviteService from "@/lib/services/broker-investor-invite.service";

const CreateBodySchema = z.object({
  inviteeEmail: z.string().optional(),
});

function buildInviteUrl(token: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") || "http://localhost:3002";
  return `${base}/i/${encodeURIComponent(token)}`;
}

/**
 * Approved broker: list invites created for copy/status UI.
 *
 * @source GET /api/broker/investor-invites
 */
export async function GET() {
  const session = await requireApprovedBroker();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const rows = await brokerInviteService.listBrokerInvestorInvitesForBroker(session.user.id);
    const registeredIds = rows
      .map((r) => r.registeredUserId)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    const progressByUserId =
      await brokerInviteService.getInvestorProgressLabelsByUserIds(registeredIds);

    const invites = rows.map((r) => {
      const linkKey = brokerInviteService.resolveInviteDisplayStatus({
        status: r.status,
        expiresAt: r.expiresAt,
      });
      const investorProgressLabel = r.registeredUserId
        ? progressByUserId.get(r.registeredUserId) ?? "—"
        : linkKey === "PENDING"
          ? "Aún no ingresó"
          : linkKey === "EXPIRED" && r.status !== "COMPLETED"
            ? "Enlace no usado"
            : "—";

      return {
        id: r.id,
        inviteUrl: buildInviteUrl(r.token),
        inviteeEmail: r.inviteeEmail,
        linkStatus: linkKey,
        linkStatusLabel: brokerInviteService.inviteLinkStatusLabel(linkKey),
        investorProgressLabel,
        dbStatus: r.status,
        createdAt: r.createdAt.toISOString(),
        expiresAt: r.expiresAt.toISOString(),
        completedAt: r.completedAt?.toISOString() ?? null,
        registeredUserId: r.registeredUserId,
      };
    });
    return NextResponse.json({ invites });
  } catch (e) {
    console.error("[GET /api/broker/investor-invites]", e);
    return NextResponse.json({ error: "No se pudo cargar las invitaciones." }, { status: 500 });
  }
}

/**
 * Approved broker: create a new invite link.
 *
 * @source POST /api/broker/investor-invites
 */
export async function POST(req: Request) {
  const session = await requireApprovedBroker();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = CreateBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const rawEmail = parsed.data.inviteeEmail?.trim();
  let inviteeEmail: string | undefined;
  if (rawEmail && rawEmail.length > 0) {
    const emailCheck = z.string().email().safeParse(rawEmail);
    if (!emailCheck.success) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }
    inviteeEmail = emailCheck.data;
  }

  try {
    const row = await brokerInviteService.createBrokerInvestorInvite({
      brokerUserId: session.user.id,
      inviteeEmail,
    });
    const inviteUrl = buildInviteUrl(row.token);
    const linkKey = brokerInviteService.resolveInviteDisplayStatus({
      status: row.status,
      expiresAt: row.expiresAt,
    });
    return NextResponse.json({
      invite: {
        id: row.id,
        inviteUrl,
        inviteeEmail: row.inviteeEmail,
        linkStatus: linkKey,
        linkStatusLabel: brokerInviteService.inviteLinkStatusLabel(linkKey),
        investorProgressLabel: "Aún no ingresó",
        createdAt: row.createdAt.toISOString(),
        expiresAt: row.expiresAt.toISOString(),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No se pudo crear la invitación.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
