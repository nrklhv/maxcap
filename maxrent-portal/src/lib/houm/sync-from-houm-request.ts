/**
 * Validates POST body for Staff → «Sincronizar desde Houm» (listado con query opcional o por IDs).
 *
 * @domain maxrent-portal
 * @see syncPropertiesFromHoum
 */

import { z } from "zod";

const MAX_IDS = 200;
const QUERY_KEY_RE = /^[a-zA-Z0-9_.-]{1,48}$/;
const QUERY_VAL_MAX = 512;

function refineListQuery(q: Record<string, string> | undefined, ctx: z.RefinementCtx): void {
  if (!q) return;
  for (const [k, v] of Object.entries(q)) {
    if (!QUERY_KEY_RE.test(k)) {
      ctx.addIssue({
        code: "custom",
        message: `Clave de consulta inválida: "${k}" (solo letras, números, _ . -, máx. 48)`,
        path: ["listQuery"],
      });
      return;
    }
    if (typeof v !== "string" || v.length > QUERY_VAL_MAX) {
      ctx.addIssue({
        code: "custom",
        message: `Valor demasiado largo para "${k}" (máx. ${QUERY_VAL_MAX})`,
        path: ["listQuery"],
      });
      return;
    }
  }
}

export const syncFromHoumRequestSchema = z
  .object({
    mode: z.enum(["list", "byIds"]).default("list"),
    /** Pares clave-valor para anexar como query string al GET de listado (según contrato Houm). */
    listQuery: z.record(z.string()).optional(),
    /** IDs Houm (mismo `id` que persiste en `houmPropertyId`). Requiere `HOUM_PROPERTY_BY_ID_PATH`. */
    houmIds: z
      .array(z.string().min(1).max(128).regex(/^[a-zA-Z0-9._-]+$/))
      .max(MAX_IDS)
      .optional(),
  })
  .superRefine((data, ctx) => {
    refineListQuery(data.listQuery, ctx);
    if (data.mode === "byIds" && (!data.houmIds || data.houmIds.length === 0)) {
      ctx.addIssue({
        code: "custom",
        message: "En modo byIds debés enviar al menos un id en houmIds",
        path: ["houmIds"],
      });
    }
  });

export type SyncFromHoumRequest = z.infer<typeof syncFromHoumRequestSchema>;

export const SYNC_FROM_HOUM_MAX_IDS = MAX_IDS;
