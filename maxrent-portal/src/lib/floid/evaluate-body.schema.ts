/**
 * Request body for POST /api/floid/evaluate (investor consent gate).
 *
 * @source POST /api/floid/evaluate
 * @domain creditEvaluation
 */

import { z } from "zod";
import { FLOID_CONSENT_VERSION } from "@/lib/floid/constants";

export const floidEvaluateRequestSchema = z.object({
  /** User confirmed they reviewed send vs. expected receive summary on screen. */
  dataPreviewAcknowledged: z.literal(true, {
    errorMap: () => ({
      message: "Debes confirmar que revisaste los datos que enviaremos a Floid",
    }),
  }),
  consentAccepted: z.literal(true, {
    errorMap: () => ({ message: "Debes aceptar el consentimiento para continuar" }),
  }),
  /** Must match server {@link FLOID_CONSENT_VERSION} (refresh page if this errors). */
  consentVersion: z.literal(FLOID_CONSENT_VERSION, {
    errorMap: () => ({
      message: "Versión de consentimiento desactualizada. Actualiza la página e inténtalo de nuevo.",
    }),
  }),
});

export type FloidEvaluateRequest = z.infer<typeof floidEvaluateRequestSchema>;
