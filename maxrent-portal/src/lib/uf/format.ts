/**
 * Helpers puros para mostrar valores UF y su equivalente en CLP en la UI.
 *
 * Sin Prisma, sin I/O. Se importan tanto desde el service `uf.service.ts`
 * como desde Client Components del portal, por eso viven en un módulo aparte
 * (si vivieran en `uf.service.ts`, importarlos en cliente arrastraría
 * `prisma` al bundle del cliente).
 *
 * @domain uf
 * @see docs/UF_RATE.md
 */

/**
 * Convierte UF a CLP usando un valor de UF dado. Devuelve número entero
 * (sin decimales, redondeado al peso más cercano).
 *
 * Lanza si los argumentos no son números finitos — es responsabilidad del
 * caller validar antes (o usar `formatUfClpHint` que ya hace el guard).
 */
export function convertUfToClp(valueUf: number, ufValueClp: number): number {
  if (!Number.isFinite(valueUf) || !Number.isFinite(ufValueClp)) {
    throw new Error("convertUfToClp: argumentos inválidos");
  }
  return Math.round(valueUf * ufValueClp);
}

/**
 * Formatea un número como CLP con separador de miles chileno y signo `$`.
 *
 * Ej.: `formatClpNumber(1234567)` → `"$1.234.567"`.
 */
export function formatClpNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `$${value.toLocaleString("es-CL", { maximumFractionDigits: 0 })}`;
}

/**
 * Devuelve "≈ $X CLP" para mostrar al lado de un valor en UF, usando la UF
 * más reciente cacheada. Devuelve `null` si:
 *   - No hay UF cacheada todavía (caso muy temprano post-deploy);
 *   - El valor en UF no es parseable.
 *
 * Los endpoints del portal pasan `valueUf` ya como string (porque vienen de
 * Prisma `Decimal.toString()`), por eso aceptamos string o number.
 */
export function formatUfClpHint(
  valueUf: string | number | null,
  latestUfValueClp: number | null
): string | null {
  if (valueUf === null || latestUfValueClp === null) return null;
  const n = typeof valueUf === "number" ? valueUf : Number(valueUf);
  if (!Number.isFinite(n)) return null;
  if (!Number.isFinite(latestUfValueClp)) return null;
  const clp = convertUfToClp(n, latestUfValueClp);
  return `≈ ${formatClpNumber(clp)} CLP`;
}

/**
 * Devuelve "UF al 13-may-2026" o similar, para mostrar como nota al pie
 * cuando se exhiben conversiones UF→CLP en la UI. Acepta la fecha en formato
 * "YYYY-MM-DD" (lo que envían los endpoints del portal).
 *
 * Devuelve `null` si la fecha no es parseable.
 */
export function formatUfRateAsOf(dateIso: string | null): string | null {
  if (!dateIso) return null;
  // Parseamos como UTC para no depender del huso del browser.
  const parts = dateIso.split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map((p) => Number(p));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const meses = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  const mesLabel = meses[m - 1];
  if (!mesLabel) return null;
  return `UF al ${d}-${mesLabel}-${y}`;
}
