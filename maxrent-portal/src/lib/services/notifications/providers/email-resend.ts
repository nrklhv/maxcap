// =============================================================================
// Email provider — Resend
// =============================================================================
//
// Adapter que implementa `EmailProvider` usando el SDK oficial de Resend.
// El SDK ya viene como dep del portal (lo usa NextAuth Resend provider).
//
// Selección: cuando `EMAIL_PROVIDER=resend` (default).
// Configuración: requiere `RESEND_API_KEY` + `EMAIL_FROM` en env.
// =============================================================================

import { Resend } from "resend";
import type { EmailProvider, SendEmailInput, SendEmailResult } from "../types";

let cachedClient: Resend | null = null;

function getClient(): Resend {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY no configurada. Agrégala a las env vars del portal."
    );
  }
  cachedClient = new Resend(apiKey);
  return cachedClient;
}

function defaultFrom(): string {
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) {
    throw new Error(
      'EMAIL_FROM no configurada (ej. "MaxRent <noreply@maxrent.cl>").'
    );
  }
  return from;
}

export const resendEmailProvider: EmailProvider = {
  slug: "resend",
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    try {
      const client = getClient();
      const result = await client.emails.send({
        from: input.from ?? defaultFrom(),
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo: input.replyTo,
      });

      // Resend SDK devuelve { data: { id }, error: null } o { data: null, error: {...} }
      if (result.error) {
        return {
          ok: false,
          errorMessage: result.error.message ?? "Resend devolvió un error sin mensaje",
          providerResponse: result.error,
        };
      }

      const id = result.data?.id;
      if (!id) {
        return {
          ok: false,
          errorMessage: "Resend no devolvió un id de mensaje",
          providerResponse: result,
        };
      }

      return {
        ok: true,
        providerMessageId: id,
        providerResponse: result.data,
      };
    } catch (err) {
      return {
        ok: false,
        errorMessage:
          err instanceof Error ? err.message : "Error desconocido al llamar a Resend",
      };
    }
  },
};
