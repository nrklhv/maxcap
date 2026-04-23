/**
 * Broker-generated invites: opaque token URL → investor claims → `User.sponsorBrokerUserId`.
 *
 * @domain maxrent-portal / broker
 * @see prisma BrokerInvestorInvite
 * @see setSponsorBrokerForInvestorByStaff — staff path sets `sponsorBrokerAssignedByStaffUserId`
 */

import { randomBytes } from "crypto";
import type { BrokerInvestorInviteStatus, EvaluationStatus } from "@prisma/client";
import { isInvestorPerfilCompleteForPortal } from "@/lib/portal/profile-labor";
import { prisma } from "@/lib/prisma";

const INVITE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function normalizeOptionalInviteeEmail(raw: string | undefined | null): string | null {
  if (raw == null) return null;
  const t = raw.trim().toLowerCase();
  return t.length ? t : null;
}

function newInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function resolveInviteDisplayStatus(row: {
  status: BrokerInvestorInviteStatus;
  expiresAt: Date;
  now?: Date;
}): "PENDING" | "COMPLETED" | "EXPIRED" {
  const now = row.now ?? new Date();
  if (row.status === "COMPLETED") return "COMPLETED";
  if (row.status === "EXPIRED") return "EXPIRED";
  if (row.expiresAt < now) return "EXPIRED";
  return "PENDING";
}

/** Spanish label for the invite *link* column (separate from investor onboarding). */
export function inviteLinkStatusLabel(
  display: ReturnType<typeof resolveInviteDisplayStatus>
): string {
  if (display === "COMPLETED") return "Usada";
  if (display === "EXPIRED") return "Expirada";
  return "Pendiente";
}

export type InvestorProgressInput = {
  onboardingCompleted: boolean;
  evaluation:
    | {
        status: EvaluationStatus;
        staffReservationApprovedAt: Date | null;
      }
    | null
    | undefined;
};

/**
 * Single-line status for broker table: bottleneck-first (what still blocks the investor).
 *
 * @pure
 */
export function resolveSponsoredInvestorProgressLabel(input: InvestorProgressInput): string {
  if (!input.onboardingCompleted) {
    return "Perfil incompleto";
  }

  const ev = input.evaluation;
  if (!ev) {
    return "Evaluación pendiente";
  }

  switch (ev.status) {
    case "PENDING":
      return "Evaluación pendiente";
    case "PROCESSING":
      return "Evaluación en proceso";
    case "FAILED":
      return "Evaluación fallida";
    case "EXPIRED":
      return "Evaluación expirada";
    case "COMPLETED":
      if (!ev.staffReservationApprovedAt) {
        return "Esperando aprobación staff";
      }
      return "Listo para reservar";
    default:
      return "Evaluación pendiente";
  }
}

export async function getInvestorProgressLabelsByUserIds(
  userIds: string[]
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(userIds.filter(Boolean)));
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: {
      id: true,
      profile: { select: { onboardingCompleted: true, additionalData: true } },
      creditEvaluations: {
        orderBy: { requestedAt: "desc" },
        take: 1,
        select: {
          status: true,
          staffReservationApprovedAt: true,
        },
      },
    },
  });

  for (const u of users) {
    const latest = u.creditEvaluations[0] ?? null;
    map.set(
      u.id,
      resolveSponsoredInvestorProgressLabel({
        onboardingCompleted: isInvestorPerfilCompleteForPortal(u.profile),
        evaluation: latest,
      })
    );
  }
  return map;
}

export async function createBrokerInvestorInvite(params: {
  brokerUserId: string;
  inviteeEmail?: string | null;
}) {
  const broker = await prisma.user.findUnique({
    where: { id: params.brokerUserId },
    select: { id: true, brokerAccessStatus: true },
  });
  if (!broker) {
    throw new Error("Broker no encontrado");
  }
  if (broker.brokerAccessStatus !== "APPROVED") {
    throw new Error("Solo brokers aprobados pueden invitar inversionistas.");
  }

  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  const inviteeEmail = normalizeOptionalInviteeEmail(params.inviteeEmail ?? null);

  return prisma.brokerInvestorInvite.create({
    data: {
      token: newInviteToken(),
      brokerUserId: params.brokerUserId,
      inviteeEmail,
      expiresAt,
    },
    select: {
      id: true,
      token: true,
      inviteeEmail: true,
      status: true,
      createdAt: true,
      expiresAt: true,
      completedAt: true,
      registeredUserId: true,
    },
  });
}

export async function listBrokerInvestorInvitesForBroker(brokerUserId: string) {
  return prisma.brokerInvestorInvite.findMany({
    where: { brokerUserId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      token: true,
      inviteeEmail: true,
      status: true,
      createdAt: true,
      expiresAt: true,
      completedAt: true,
      registeredUserId: true,
    },
  });
}

/** Public: token exists, pending, not expired, broker still approved. */
export async function validateBrokerInvestorInviteTokenPublic(token: string): Promise<boolean> {
  const invite = await prisma.brokerInvestorInvite.findUnique({
    where: { token },
    include: { broker: { select: { brokerAccessStatus: true } } },
  });
  if (!invite) return false;
  if (invite.status !== "PENDING") return false;
  if (invite.expiresAt < new Date()) return false;
  if (invite.broker.brokerAccessStatus !== "APPROVED") return false;
  return true;
}

export async function claimBrokerInvestorInviteForInvestor(params: {
  token: string;
  investorUserId: string;
}) {
  const invite = await prisma.brokerInvestorInvite.findUnique({
    where: { token: params.token },
    include: { broker: { select: { id: true, brokerAccessStatus: true } } },
  });
  if (!invite) {
    throw new Error("Enlace inválido o ya no está disponible.");
  }

  const now = new Date();
  if (invite.expiresAt < now) {
    if (invite.status === "PENDING") {
      await prisma.brokerInvestorInvite
        .update({
          where: { id: invite.id },
          data: { status: "EXPIRED" },
        })
        .catch(() => {});
    }
    throw new Error("Este enlace expiró.");
  }

  if (invite.broker.brokerAccessStatus !== "APPROVED") {
    throw new Error("El broker que te invitó ya no está habilitado.");
  }

  const investor = await prisma.user.findUnique({
    where: { id: params.investorUserId },
    select: { id: true, canInvest: true, sponsorBrokerUserId: true },
  });
  if (!investor) {
    throw new Error("Usuario no encontrado.");
  }
  if (!investor.canInvest) {
    throw new Error("Solo cuentas con perfil inversionista pueden vincularse a un broker.");
  }
  if (investor.id === invite.brokerUserId) {
    throw new Error("No podés usar tu propio enlace de invitación.");
  }

  if (invite.status === "COMPLETED" && invite.registeredUserId === investor.id) {
    return { ok: true as const, alreadyCompleted: true, linked: false as const };
  }
  if (invite.status !== "PENDING") {
    throw new Error("Este enlace ya fue utilizado.");
  }

  if (investor.sponsorBrokerUserId && investor.sponsorBrokerUserId !== invite.brokerUserId) {
    throw new Error("Ya tenés un broker asociado. Contactá a soporte si necesitás cambiarlo.");
  }

  if (investor.sponsorBrokerUserId === invite.brokerUserId) {
    await prisma.brokerInvestorInvite.update({
      where: { id: invite.id },
      data: {
        status: "COMPLETED",
        registeredUserId: investor.id,
        completedAt: now,
      },
    });
    return { ok: true as const, alreadyCompleted: false, linked: false as const };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: investor.id },
      data: {
        sponsorBrokerUserId: invite.brokerUserId,
        sponsorBrokerAssignedAt: now,
        sponsorBrokerAssignedByStaffUserId: null,
      },
    }),
    prisma.brokerInvestorInvite.update({
      where: { id: invite.id },
      data: {
        status: "COMPLETED",
        registeredUserId: investor.id,
        completedAt: now,
      },
    }),
  ]);

  return { ok: true as const, alreadyCompleted: false, linked: true as const };
}
