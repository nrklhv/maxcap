/**
 * Staff-managed link: investor `User` → approved broker `User` (`sponsorBrokerUserId`).
 * Brokers list sponsored investors and their reservations via dedicated APIs.
 *
 * @domain maxrent-portal / broker
 * @see prisma User.sponsorBrokerUserId
 */

import type { ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { INVESTOR_ACTIVE_RESERVATION_STATUSES } from "@/lib/portal/investor-active-reservation-statuses";

const ACTIVE_STATUSES = [...INVESTOR_ACTIVE_RESERVATION_STATUSES] as ReservationStatus[];

export async function setSponsorBrokerForInvestorByStaff(params: {
  investorUserId: string;
  sponsorBrokerUserId: string | null;
  staffUserId: string;
}) {
  const { investorUserId, sponsorBrokerUserId, staffUserId } = params;

  const investor = await prisma.user.findUnique({ where: { id: investorUserId } });
  if (!investor) {
    throw new Error("Usuario no encontrado");
  }
  if (!investor.canInvest) {
    throw new Error("Solo se asigna broker a cuentas con perfil inversionista (canInvest).");
  }
  if (sponsorBrokerUserId === investorUserId) {
    throw new Error("No podés asignar al usuario como su propio broker.");
  }

  if (sponsorBrokerUserId) {
    const broker = await prisma.user.findUnique({
      where: { id: sponsorBrokerUserId },
      select: { id: true, brokerAccessStatus: true },
    });
    if (!broker) {
      throw new Error("Broker no encontrado");
    }
    if (broker.brokerAccessStatus !== "APPROVED") {
      throw new Error("El usuario destino no es un broker aprobado.");
    }
  }

  return prisma.user.update({
    where: { id: investorUserId },
    data: {
      sponsorBrokerUserId: sponsorBrokerUserId,
      sponsorBrokerAssignedAt: sponsorBrokerUserId ? new Date() : null,
      sponsorBrokerAssignedByStaffUserId: sponsorBrokerUserId ? staffUserId : null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      sponsorBrokerUserId: true,
      sponsorBrokerAssignedAt: true,
    },
  });
}

export async function listSponsoredInvestorsForBroker(brokerUserId: string) {
  return prisma.user.findMany({
    where: { sponsorBrokerUserId: brokerUserId, canInvest: true },
    select: { id: true, email: true, name: true, createdAt: true },
    orderBy: { email: "asc" },
  });
}

export async function listSponsoredReservationsForBroker(
  brokerUserId: string,
  opts?: { activeOnly?: boolean }
) {
  const activeOnly = opts?.activeOnly !== false;
  return prisma.reservation.findMany({
    where: {
      user: { sponsorBrokerUserId: brokerUserId },
      ...(activeOnly ? { status: { in: ACTIVE_STATUSES } } : {}),
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });
}
