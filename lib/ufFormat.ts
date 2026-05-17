/**
 * Helpers puros para formatear UF y CLP en la landing pública.
 *
 * Pure functions — no fetch, no Prisma, no I/O. Safe en cualquier lugar
 * (Server o Client Components).
 *
 * Si en el futuro la landing renderiza estos valores en más lugares (calculadora,
 * cards, etc.), este módulo concentra el formato para no duplicar reglas.
 */

/** "$39.458" — sin decimales, separador chileno, signo. */
export function formatClp(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `$${value.toLocaleString("es-CL", { maximumFractionDigits: 0 })}`;
}

/** "1 UF = $39.458" — texto del badge del header. */
export function formatUfBadge(valueClp: number): string {
  return `1 UF = ${formatClp(valueClp)}`;
}
