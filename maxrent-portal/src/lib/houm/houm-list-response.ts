/**
 * Zod schemas and helpers to normalize a flexible Houm (or upstream) property list JSON.
 * Adjust field priority in `deriveTitle` when the real API contract is known.
 *
 * @domain maxrent-portal
 * @pure parseHoumPropertyList, deriveTitle, houmPropertyKey
 */

import { z } from "zod";

const HoumPropertyRawSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
  })
  .passthrough();

const HoumListSchema = z.union([
  z.array(HoumPropertyRawSchema),
  z.object({ data: z.array(HoumPropertyRawSchema) }),
  z.object({ properties: z.array(HoumPropertyRawSchema) }),
  z.object({ items: z.array(HoumPropertyRawSchema) }),
  z.object({ results: z.array(HoumPropertyRawSchema) }),
]);

export type HoumPropertyRaw = z.infer<typeof HoumPropertyRawSchema>;

export function parseHoumPropertyList(json: unknown): HoumPropertyRaw[] {
  const parsed = HoumListSchema.parse(json);
  if (Array.isArray(parsed)) return parsed;
  if ("data" in parsed) return parsed.data;
  if ("properties" in parsed) return parsed.properties;
  if ("items" in parsed) return parsed.items;
  return parsed.results;
}

/**
 * Parses one property object from a Houm GET-by-id (or similar) response.
 * Accepts `{ data }`, `{ property }`, `{ item }`, `{ result }`, or the raw object.
 */
export function parseHoumPropertySingle(json: unknown): HoumPropertyRaw {
  const o = json && typeof json === "object" && !Array.isArray(json) ? (json as Record<string, unknown>) : null;
  if (!o) {
    throw new Error("Expected JSON object for single property");
  }
  for (const key of ["data", "property", "item", "result"] as const) {
    const inner = o[key];
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      try {
        return HoumPropertyRawSchema.parse(inner);
      } catch {
        /* try next wrapper */
      }
    }
  }
  return HoumPropertyRawSchema.parse(json);
}

export function houmPropertyKey(raw: HoumPropertyRaw): string {
  return String(raw.id);
}

/** Pick a display title from common Houm/admin API field names. */
export function deriveTitle(raw: HoumPropertyRaw): string {
  const r = raw as Record<string, unknown>;
  const keys = [
    "title",
    "name",
    "full_address",
    "fullAddress",
    "address",
    "label",
    "street",
  ] as const;
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "string" && v.trim()) return v.trim().slice(0, 300);
  }
  return `Propiedad ${houmPropertyKey(raw)}`.slice(0, 300);
}
