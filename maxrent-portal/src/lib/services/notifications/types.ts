// =============================================================================
// Notifications — tipos compartidos por la capa de servicio
// =============================================================================
//
// API pública: ver `index.ts`. Aquí solo tipos para que cualquier adapter,
// template y consumer hablen el mismo lenguaje.
// =============================================================================

import type { NotificationChannel } from "@prisma/client";

/** Slug del proveedor configurado. Sirve como key del registry. */
export type ProviderSlug = "resend";

/** Payload mínimo para mandar un email crudo (sin templates). */
export type SendEmailInput = {
  to: string;
  subject: string;
  /** HTML pre-renderizado. Para usar templates, ver `notify({ template, variables })`. */
  html: string;
  /** Versión texto plano alternativa (recomendada para compatibilidad / accessibility). */
  text?: string;
  /** Override del `from` configurado a nivel servicio. Útil para reenvíos desde otro alias. */
  from?: string;
  /** Reply-To opcional. */
  replyTo?: string;
};

/** Resultado uniforme que devuelve cualquier adapter de email. */
export type SendEmailResult =
  | {
      ok: true;
      providerMessageId: string;
      providerResponse: unknown;
    }
  | {
      ok: false;
      errorMessage: string;
      providerResponse?: unknown;
    };

/** Interfaz que cualquier provider de email debe implementar. */
export interface EmailProvider {
  readonly slug: ProviderSlug;
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

/** Input público de la API `notify()`. */
export type NotifyInput = {
  channel: Extract<NotificationChannel, "EMAIL">;
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  /** Identificador del template (string libre por ahora; el registry oficial llega en PR B). */
  templateKey: string;
  /** Variables que se usaron al renderizar (snapshot para auditoría). */
  variables?: Record<string, unknown>;
  /** Vincular con un User. Null para leads sin cuenta aún (se puede backfillear luego). */
  userId?: string | null;
};

export type NotifyResult = {
  notificationId: string;
  status: "SENT" | "FAILED";
  providerMessageId?: string;
  errorMessage?: string;
};
