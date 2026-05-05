import { prisma } from "@/lib/prisma";
import {
  assertBrokerProfileCompleteOrThrow,
  isBrokerProfileComplete,
  type BrokerProfilePatchInput,
} from "@/lib/broker/broker-profile-schema";
import {
  ensureBrokerReferralCode,
  safeRunReferralHook,
} from "@/lib/services/referral.service";

export async function listBrokerUsers() {
  return prisma.user.findMany({
    where: { brokerAccessStatus: { not: null } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      brokerAccessStatus: true,
      brokerReviewedAt: true,
      brokerProfile: {
        select: {
          companyName: true,
          jobTitle: true,
          isIndependent: true,
          websiteUrl: true,
          linkedinUrl: true,
        },
      },
    },
  });
}

export async function approveBroker(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u?.brokerAccessStatus) {
    throw new Error("Solicitud broker no encontrada");
  }
  if (u.brokerAccessStatus === "APPROVED") {
    throw new Error("Ya está aprobada");
  }
  if (u.brokerAccessStatus !== "PENDING") {
    throw new Error("Solo se puede aprobar una solicitud en estado pendiente");
  }
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      brokerAccessStatus: "APPROVED",
      brokerReviewedAt: new Date(),
    },
    select: {
      id: true,
      email: true,
      brokerAccessStatus: true,
    },
  });

  // Generar el code BRK- ahora que el broker está aprobado. Idempotente: si
  // ya existe (caso edge: broker re-aprobado tras rechazo previo) no se toca.
  // Best-effort: si falla, no rompemos la aprobación — se puede regenerar
  // después con `ensureBrokerReferralCode`.
  await safeRunReferralHook("ensureBrokerReferralCode", () =>
    ensureBrokerReferralCode(userId)
  );

  return updated;
}

export async function rejectBroker(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u?.brokerAccessStatus) {
    throw new Error("Solicitud broker no encontrada");
  }
  if (u.brokerAccessStatus === "REJECTED") {
    throw new Error("Ya está rechazada");
  }
  return prisma.user.update({
    where: { id: userId },
    data: {
      brokerAccessStatus: "REJECTED",
      brokerReviewedAt: new Date(),
    },
    select: {
      id: true,
      email: true,
      brokerAccessStatus: true,
    },
  });
}

export async function getBrokerProfileByUserId(userId: string) {
  return prisma.brokerProfile.findUnique({
    where: { userId },
  });
}

export async function upsertBrokerProfile(userId: string, input: BrokerProfilePatchInput) {
  return prisma.brokerProfile.upsert({
    where: { userId },
    create: {
      userId,
      companyName: input.companyName.trim(),
      jobTitle: input.jobTitle.trim(),
      isIndependent: input.isIndependent,
      websiteUrl: input.websiteUrl ?? null,
      linkedinUrl: input.linkedinUrl ?? null,
      pitch: input.pitch ?? null,
    },
    update: {
      companyName: input.companyName.trim(),
      jobTitle: input.jobTitle.trim(),
      isIndependent: input.isIndependent,
      websiteUrl: input.websiteUrl ?? null,
      linkedinUrl: input.linkedinUrl ?? null,
      pitch: input.pitch ?? null,
    },
  });
}

/** Activa flujo broker en PENDING sin quitar acceso inversionista */
export async function requestBrokerAccess(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { brokerProfile: true },
  });
  if (!user) throw new Error("Usuario no encontrado");
  if (user.brokerAccessStatus === "APPROVED") {
    throw new Error("Tu cuenta broker ya está aprobada");
  }
  if (user.brokerAccessStatus === "PENDING") {
    return user;
  }

  assertBrokerProfileCompleteOrThrow(user.brokerProfile);

  if (user.brokerAccessStatus === "REJECTED") {
    return prisma.user.update({
      where: { id: userId },
      data: {
        brokerAccessStatus: "PENDING",
        brokerReviewedAt: null,
      },
    });
  }
  return prisma.user.update({
    where: { id: userId },
    data: {
      brokerAccessStatus: "PENDING",
      brokerReviewedAt: null,
    },
  });
}

export async function userHasCompleteBrokerProfile(userId: string): Promise<boolean> {
  const row = await getBrokerProfileByUserId(userId);
  if (!row) return false;
  return isBrokerProfileComplete(row);
}
