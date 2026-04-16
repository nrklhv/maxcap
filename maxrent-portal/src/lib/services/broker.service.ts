import { prisma } from "@/lib/prisma";

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
  return prisma.user.update({
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

/** Activa flujo broker en PENDING sin quitar acceso inversionista */
export async function requestBrokerAccess(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Usuario no encontrado");
  if (user.brokerAccessStatus === "APPROVED") {
    throw new Error("Tu cuenta broker ya está aprobada");
  }
  if (user.brokerAccessStatus === "PENDING") {
    return user;
  }
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
