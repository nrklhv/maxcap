/**
 * Staff-facing queries for investor accounts (`canInvest`), including optional Floid history.
 *
 * @domain maxrent-portal
 * @see CreditEvaluation — latest row per user when present; reservation gate actions apply only then
 */

import { prisma } from "@/lib/prisma";

export type StaffInvestorListRow = {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  evaluation: {
    id: string;
    status: string;
    requestedAt: Date;
    completedAt: Date | null;
    staffReservationApprovedAt: Date | null;
  } | null;
  sponsorBroker: { id: string; email: string; name: string | null } | null;
  /** Último check de "preaprobado AVLA" disparado manualmente por staff. */
  avlaCheck: {
    id: string;
    preapproved: boolean | null;
    state: string | null;
    stateTags: string[];
    errorMessage: string | null;
    createdAt: Date;
  } | null;
  /** True si el perfil del usuario tiene RUT + nombre cargados (precondición para disparar AVLA). */
  hasProfileForAvla: boolean;
};

/**
 * All users with investor portal access (`canInvest`), ordered by signup. Includes the most
 * recent credit evaluation when any exist (otherwise `evaluation` is null).
 */
export async function listInvestorsForStaff(): Promise<StaffInvestorListRow[]> {
  const users = await prisma.user.findMany({
    where: { canInvest: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      sponsorBrokerUserId: true,
      sponsorBroker: {
        select: { id: true, email: true, name: true },
      },
      profile: { select: { rut: true } },
      creditEvaluations: {
        orderBy: { requestedAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          requestedAt: true,
          completedAt: true,
          staffReservationApprovedAt: true,
        },
      },
      avlaChecks: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          preapproved: true,
          state: true,
          stateTags: true,
          errorMessage: true,
          createdAt: true,
        },
      },
    },
  });

  return users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    createdAt: u.createdAt,
    evaluation: u.creditEvaluations[0] ?? null,
    sponsorBroker: u.sponsorBroker,
    avlaCheck: u.avlaChecks[0] ?? null,
    hasProfileForAvla: Boolean(u.profile?.rut && u.name?.trim()),
  }));
}

/**
 * Full investor record for staff drawer: user + profile + evaluation history (latest first).
 * Returns `null` if the user does not exist or does not have investor access (`canInvest`).
 */
export async function getInvestorDetailForStaff(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      sponsorBroker: { select: { id: true, email: true, name: true, brokerAccessStatus: true } },
      profile: true,
      creditEvaluations: {
        orderBy: { requestedAt: "desc" },
        take: 50,
        select: {
          id: true,
          status: true,
          summary: true,
          downloadPdfUrl: true,
          rawResponse: true,
          errorMessage: true,
          requestedAt: true,
          completedAt: true,
          consentAt: true,
          consentVersion: true,
          floidCaseId: true,
          staffNotes: true,
          staffReservationApprovedAt: true,
          staffReservationApprovedByUserId: true,
        },
      },
    },
  });

  if (!user || !user.canInvest) {
    return null;
  }

  return user;
}
