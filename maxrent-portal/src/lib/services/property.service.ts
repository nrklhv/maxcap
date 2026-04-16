import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function listPropertiesForAdmin() {
  return prisma.property.findMany({
    orderBy: { updatedAt: "desc" },
  });
}

export async function listPropertiesForBrokers() {
  return prisma.property.findMany({
    where: {
      status: "AVAILABLE",
      visibleToBrokers: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getPropertyForBroker(id: string) {
  return prisma.property.findFirst({
    where: {
      id,
      status: "AVAILABLE",
      visibleToBrokers: true,
    },
  });
}

export async function createProperty(data: {
  title: string;
  status?: "AVAILABLE" | "RESERVED" | "SOLD" | "ARCHIVED";
  visibleToBrokers?: boolean;
  metadata?: unknown;
}) {
  return prisma.property.create({
    data: {
      title: data.title,
      status: data.status ?? "AVAILABLE",
      visibleToBrokers: data.visibleToBrokers ?? true,
      metadata:
        data.metadata === undefined || data.metadata === null
          ? undefined
          : (data.metadata as Prisma.InputJsonValue),
    },
  });
}

export async function updateProperty(
  id: string,
  data: {
    title?: string;
    status?: "AVAILABLE" | "RESERVED" | "SOLD" | "ARCHIVED";
    visibleToBrokers?: boolean;
    metadata?: unknown;
  }
) {
  const payload: Prisma.PropertyUpdateInput = {};
  if (data.title !== undefined) payload.title = data.title;
  if (data.status !== undefined) payload.status = data.status;
  if (data.visibleToBrokers !== undefined) {
    payload.visibleToBrokers = data.visibleToBrokers;
  }
  if (data.metadata !== undefined) {
    payload.metadata =
      data.metadata === null
        ? Prisma.JsonNull
        : (data.metadata as Prisma.InputJsonValue);
  }
  return prisma.property.update({
    where: { id },
    data: payload,
  });
}

export async function deleteProperty(id: string) {
  return prisma.property.delete({ where: { id } });
}
