/**
 * Zod schemas for broker commercial profile (PATCH body and completeness before apply).
 *
 * @domain maxrent-portal / broker
 */

import { z } from "zod";

function emptyToUndefined(s: unknown): unknown {
  if (typeof s !== "string") return s;
  const t = s.trim();
  return t === "" ? undefined : t;
}

/**
 * Accepts `www.example.com`, `example.com/path`, `https://…`, etc.
 * Empty / whitespace → undefined. Otherwise ensures a scheme for `URL` / Zod `.url()`.
 */
export function normalizeBrokerOptionalUrl(val: unknown): unknown {
  const inner = emptyToUndefined(val);
  if (inner === undefined || typeof inner !== "string") return undefined;
  const t = inner.trim();
  if (t === "") return undefined;
  if (t.startsWith("//")) return `https:${t}`;
  if (/^[a-z][a-z0-9+.-]*:/i.test(t)) return t;
  return `https://${t}`;
}

const optionalUrl = z.preprocess(
  normalizeBrokerOptionalUrl,
  z.string().url("URL inválida").max(2048).optional()
);

export const brokerProfilePatchSchema = z.object({
  companyName: z.string().max(300),
  jobTitle: z.string().max(300),
  isIndependent: z.boolean(),
  websiteUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  pitch: z.preprocess(
    emptyToUndefined,
    z.string().max(4000).optional()
  ),
});

export type BrokerProfilePatchInput = z.infer<typeof brokerProfilePatchSchema>;

/** Minimum data required before `POST /api/broker/apply`. */
export const brokerProfileCompleteSchema = z.object({
  companyName: z.string().trim().min(1, "Indicá el nombre de la empresa o razón social"),
  jobTitle: z.string().trim().min(1, "Indicá tu cargo"),
  isIndependent: z.boolean(),
  websiteUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  pitch: z.preprocess(
    emptyToUndefined,
    z.string().max(4000).optional()
  ),
});

export type BrokerProfileRowInput = {
  companyName: string;
  jobTitle: string;
  isIndependent: boolean;
  websiteUrl: string | null;
  linkedinUrl: string | null;
  pitch: string | null;
};

export function isBrokerProfileComplete(row: BrokerProfileRowInput | null): boolean {
  if (!row) return false;
  const parsed = brokerProfileCompleteSchema.safeParse({
    companyName: row.companyName,
    jobTitle: row.jobTitle,
    isIndependent: row.isIndependent,
    websiteUrl: row.websiteUrl ?? "",
    linkedinUrl: row.linkedinUrl ?? "",
    pitch: row.pitch ?? "",
  });
  return parsed.success;
}

export function assertBrokerProfileCompleteOrThrow(row: BrokerProfileRowInput | null): void {
  if (!row) {
    throw new Error("Completá tu perfil comercial en «Perfil» antes de enviar la solicitud.");
  }
  const parsed = brokerProfileCompleteSchema.safeParse({
    companyName: row.companyName,
    jobTitle: row.jobTitle,
    isIndependent: row.isIndependent,
    websiteUrl: row.websiteUrl ?? "",
    linkedinUrl: row.linkedinUrl ?? "",
    pitch: row.pitch ?? "",
  });
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg =
      first.companyName?.[0] ||
      first.jobTitle?.[0] ||
      first.websiteUrl?.[0] ||
      first.linkedinUrl?.[0] ||
      "Completá tu perfil comercial en «Perfil» antes de enviar la solicitud.";
    throw new Error(msg);
  }
}
