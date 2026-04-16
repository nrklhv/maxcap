// =============================================================================
// Zod Schemas — Validación compartida entre cliente y servidor
// =============================================================================

import { z } from "zod";

// Validar RUT chileno (formato: 12.345.678-9 o 12345678-9)
export function isValidRut(rut: string): boolean {
  const clean = rut.replace(/\./g, "").replace(/-/g, "");
  if (clean.length < 2) return false;

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1).toUpperCase();

  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expectedDv = 11 - (sum % 11);
  const dvMap: Record<number, string> = { 11: "0", 10: "K" };
  const expected = dvMap[expectedDv] || expectedDv.toString();

  return dv === expected;
}

/** Dígitos nacionales 9XXXXXXXX (móvil Chile) a partir de texto libre (+56, espacios, etc.) */
export function normalizeChileMobileDigits(input: string): string {
  const digits = input.replace(/\D/g, "");
  let n = digits;
  if (n.startsWith("56")) n = n.slice(2);
  if (n.startsWith("0")) n = n.slice(1);
  return n;
}

export function isValidChileMobileNational(digits: string): boolean {
  return digits.length === 9 && /^9\d{8}$/.test(digits);
}

/** Formato almacenado / API: +56912345678 */
export function chileMobileToE164(nationalNineDigits: string): string {
  return `+56${nationalNineDigits}`;
}

export const profileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "El nombre es requerido")
    .max(100, "El nombre es demasiado largo"),
  lastName: z
    .string()
    .trim()
    .min(1, "El apellido es requerido")
    .max(100, "El apellido es demasiado largo"),
  contactEmail: z
    .string()
    .trim()
    .min(1, "El email es requerido")
    .max(254, "Email demasiado largo")
    .email("Email inválido")
    .transform((s) => s.toLowerCase()),
  rut: z
    .string()
    .min(1, "El RUT es requerido")
    .refine(isValidRut, "RUT inválido"),
  phone: z
    .string()
    .min(1, "El teléfono es requerido")
    .transform((s) => normalizeChileMobileDigits(s))
    .refine(isValidChileMobileNational, {
      message:
        "Teléfono móvil chileno inválido (9 dígitos comenzando en 9, ej. +56 9 1234 5678)",
    })
    .transform((national) => chileMobileToE164(national)),
  address: z.string().trim().min(1, "La dirección es requerida").max(500),
  commune: z.string().trim().min(1, "La comuna es requerida").max(100),
  city: z.string().trim().min(1, "La ciudad es requerida").max(100),
});

export const reservationSchema = z.object({
  propertyId: z.string().min(1, "La propiedad es requerida"),
  evaluationId: z.string().optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type ReservationInput = z.infer<typeof reservationSchema>;

const propertyStatusSchema = z.enum([
  "AVAILABLE",
  "RESERVED",
  "SOLD",
  "ARCHIVED",
]);

export const propertyCreateSchema = z.object({
  title: z.string().trim().min(1, "Título requerido").max(300),
  status: propertyStatusSchema.optional(),
  visibleToBrokers: z.boolean().optional(),
  metadata: z.unknown().optional().nullable(),
});

export const propertyUpdateSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  status: propertyStatusSchema.optional(),
  visibleToBrokers: z.boolean().optional(),
  metadata: z.unknown().optional().nullable(),
});

export type PropertyCreateInput = z.infer<typeof propertyCreateSchema>;
export type PropertyUpdateInput = z.infer<typeof propertyUpdateSchema>;
