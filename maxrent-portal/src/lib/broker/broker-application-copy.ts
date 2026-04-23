/**
 * User-facing copy for broker access application. Kept in sync with
 * `brokerProfileCompleteSchema` / `POST /api/broker/apply` gate in `broker-profile-schema.ts`.
 *
 * @domain maxrent-portal / broker
 * @see brokerProfileCompleteSchema — required vs optional fields
 */

/** Bullet lines shown before sending the application (commercial profile). */
export const BROKER_APPLICATION_REQUIREMENT_LINES: readonly string[] = [
  "Nombre de empresa o razón social (obligatorio).",
  "Cargo en la empresa (obligatorio).",
  "Indicar si trabajás como independiente o no (obligatorio).",
  "Sitio web y/o perfil de LinkedIn (opcionales; podés escribir www.… o la ruta completa; si falta https:// se agrega al guardar).",
  "Pitch o comentario comercial (opcional).",
];

export function getBrokerApplicationRequirementsCopy(): readonly string[] {
  return BROKER_APPLICATION_REQUIREMENT_LINES;
}
