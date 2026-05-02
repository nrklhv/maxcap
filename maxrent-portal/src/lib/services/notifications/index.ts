// =============================================================================
// Notifications — API pública
// =============================================================================
//
// Toda comunicación saliente (email/SMS/etc.) DEBE pasar por `notify()`.
// El código de negocio NUNCA debe importar SDKs de proveedores directamente
// (esto rompe la abstracción y dificulta cambiar de proveedor).
//
// Esta versión (PR A) soporta solo email con HTML pre-renderizado.
// PR B agrega `notifyTemplate({ template, variables })` con react-email.
//
// Ver: memory/project_notifications_infra.md y ./README.md
// =============================================================================

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEmailProvider } from "./providers/_registry";
import {
  renderTemplate,
  type TemplateKey,
  type TemplateMap,
} from "./templates/_registry";
import type { NotifyInput, NotifyResult } from "./types";

/** Envía una notificación y la registra en la tabla `Notification`. */
export async function notify(input: NotifyInput): Promise<NotifyResult> {
  const provider = getEmailProvider();

  // 1) Crear registro en QUEUED antes de llamar al proveedor para no perder
  //    rastro si el proceso muere a mitad de la llamada.
  const variablesJson: Prisma.InputJsonValue | undefined =
    input.variables == null
      ? undefined
      : (input.variables as Prisma.InputJsonValue);

  const notification = await prisma.notification.create({
    data: {
      channel: "EMAIL",
      templateKey: input.templateKey,
      recipient: input.to,
      userId: input.userId ?? null,
      variables: variablesJson,
      status: "QUEUED",
      provider: provider.slug,
    },
    select: { id: true },
  });

  // 2) Llamar al adapter del proveedor.
  const result = await provider.send({
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    from: input.from,
    replyTo: input.replyTo,
  });

  // 3) Persistir resultado (SENT o FAILED).
  if (result.ok) {
    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        providerMessageId: result.providerMessageId,
        providerResponse: result.providerResponse as Prisma.InputJsonValue,
      },
    });
    return {
      notificationId: notification.id,
      status: "SENT",
      providerMessageId: result.providerMessageId,
    };
  }

  await prisma.notification.update({
    where: { id: notification.id },
    data: {
      status: "FAILED",
      errorMessage: result.errorMessage,
      providerResponse:
        result.providerResponse == null
          ? undefined
          : (result.providerResponse as Prisma.InputJsonValue),
    },
  });
  return {
    notificationId: notification.id,
    status: "FAILED",
    errorMessage: result.errorMessage,
  };
}

/**
 * Renderiza un template registrado y lo envía. Es el camino preferido para
 * comunicaciones del producto (welcome, magic link, evaluación, etc.).
 *
 * El typing garantiza que las `variables` correspondan al template que se
 * está usando (ej. `welcome-investor` exige `{ firstName?, email, portalUrl }`).
 *
 * Igual que `notify()`: registra QUEUED → SENT/FAILED en la tabla `Notification`.
 */
export async function notifyTemplate<K extends TemplateKey>(params: {
  template: K;
  variables: TemplateMap[K];
  to: string;
  userId?: string | null;
  /** Override opcional del `from` configurado a nivel servicio. */
  from?: string;
  replyTo?: string;
}): Promise<NotifyResult> {
  const rendered = await renderTemplate(params.template, params.variables);
  return notify({
    channel: "EMAIL",
    to: params.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    from: params.from,
    replyTo: params.replyTo,
    templateKey: params.template,
    variables: params.variables as Record<string, unknown>,
    userId: params.userId ?? null,
  });
}

/**
 * Asocia con un User las notificaciones previas que se enviaron a su email
 * cuando aún no había cuenta (lead-only). Llamar desde el evento `createUser`
 * de NextAuth cuando se vincula un Lead, para que el timeline del User
 * incluya el welcome email y demás comunicaciones pre-cuenta.
 */
export async function backfillUserNotifications(params: {
  userId: string;
  email: string;
}): Promise<{ updated: number }> {
  const result = await prisma.notification.updateMany({
    where: {
      recipient: params.email.toLowerCase(),
      userId: null,
    },
    data: { userId: params.userId },
  });
  return { updated: result.count };
}
