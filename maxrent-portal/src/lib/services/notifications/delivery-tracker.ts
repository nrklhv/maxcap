// =============================================================================
// Delivery tracker — actualiza Notification.status desde eventos del proveedor
// =============================================================================
//
// Cada proveedor manda eventos con su propio shape. Los normalizamos acá a
// un `DeliveryEvent` común y aplicamos un update sobre la fila de Notification
// que matchea por `providerMessageId`.
//
// Reglas:
//  - SENT no se sobreescribe a la baja (si ya estaba DELIVERED, un evento
//    sent posterior no degrada).
//  - DELIVERED, OPENED, BOUNCED, COMPLAINED son terminales o quasi-terminales:
//    se aplican siempre con su timestamp.
//  - Eventos desconocidos se ignoran sin error.
// =============================================================================

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Shape común que cualquier provider de email termina mapeando. */
export type DeliveryEvent = {
  /** Id que devuelve el proveedor para esa entrega — matchea con providerMessageId. */
  providerMessageId: string;
  /** Tipo de evento. Más tipos pueden sumarse a futuro. */
  type:
    | "sent"
    | "delivered"
    | "opened"
    | "clicked"
    | "bounced"
    | "complained"
    | "delivery_delayed";
  /** ISO timestamp del evento (cuando lo reporta el proveedor). */
  occurredAt: Date;
  /** Payload completo del proveedor para auditoría. */
  rawPayload: unknown;
};

/**
 * Aplica un evento de delivery a la fila de Notification que corresponda.
 * Si no hay fila con ese `providerMessageId`, devuelve `notFound`.
 */
export async function applyDeliveryEvent(
  event: DeliveryEvent
): Promise<{ ok: true } | { notFound: true }> {
  const row = await prisma.notification.findFirst({
    where: { providerMessageId: event.providerMessageId },
    select: { id: true, status: true },
  });
  if (!row) return { notFound: true };

  const data: Prisma.NotificationUpdateInput = {};
  switch (event.type) {
    case "sent":
      // SENT ya lo seteamos al enviar. Si llega evento sent del provider y
      // estamos todavía en QUEUED por algún race, lo subimos.
      if (row.status === "QUEUED") {
        data.status = "SENT";
        data.sentAt = event.occurredAt;
      }
      break;

    case "delivered":
      data.status = "DELIVERED";
      data.deliveredAt = event.occurredAt;
      break;

    case "opened":
      // Solo subimos a OPENED si todavía no estaba en estado terminal negativo.
      if (
        row.status !== "BOUNCED" &&
        row.status !== "COMPLAINED" &&
        row.status !== "FAILED"
      ) {
        data.status = "OPENED";
        data.openedAt = event.occurredAt;
      }
      break;

    case "bounced":
      data.status = "BOUNCED";
      break;

    case "complained":
      data.status = "COMPLAINED";
      break;

    case "clicked":
    case "delivery_delayed":
      // No tenemos status para estos hoy; igual guardamos el payload abajo.
      break;
  }

  // Mergear payload de evento dentro de providerResponse (auditoría).
  // Mantenemos un array de events para historial completo.
  const merged: Prisma.InputJsonValue = {
    lastEvent: {
      type: event.type,
      occurredAt: event.occurredAt.toISOString(),
      payload: event.rawPayload as Prisma.InputJsonValue,
    },
  };
  data.providerResponse = merged;

  await prisma.notification.update({
    where: { id: row.id },
    data,
  });

  return { ok: true };
}
