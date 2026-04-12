import { z } from "zod";

const trimmed = (max: number) => z.string().trim().min(1).max(max);

export const marketingAttributionSchema = z
  .object({
    utm_source: z.string().trim().max(256).nullish(),
    utm_medium: z.string().trim().max(256).nullish(),
    utm_campaign: z.string().trim().max(256).nullish(),
    utm_term: z.string().trim().max(256).nullish(),
    utm_content: z.string().trim().max(256).nullish(),
    gclid: z.string().trim().max(512).nullish(),
    fbclid: z.string().trim().max(512).nullish(),
    referrer: z.string().trim().max(2048).nullish(),
    landing_path: z.string().trim().max(512).nullish(),
    captured_at: z.string().trim().max(64).nullish(),
  })
  .strict()
  .nullish();

const baseLeadFields = {
  nombre: trimmed(120),
  apellido: trimmed(120),
  email: trimmed(254).email(),
  whatsapp: trimmed(40),
  marketing_attribution: marketingAttributionSchema,
};

export const leadInversionistaSchema = z
  .object({
    type: z.literal("inversionista"),
    ...baseLeadFields,
  })
  .strict();

export const leadVendedorSchema = z
  .object({
    type: z.literal("vendedor"),
    ...baseLeadFields,
    cantidad_propiedades: trimmed(32),
    arrendadas: trimmed(120),
    admin_houm: trimmed(120),
  })
  .strict();

export const leadBodySchema = z.discriminatedUnion("type", [leadInversionistaSchema, leadVendedorSchema]);

export type LeadBodyInput = z.infer<typeof leadBodySchema>;
