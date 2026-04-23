/**
 * Pretty-print Chile RUT for read-only UI (aligned with investor portal).
 *
 * @domain maxrent-portal / portal
 * @pure
 */

export function formatRutForDisplay(rut: string | null | undefined): string {
  if (!rut?.trim()) return "—";
  const clean = rut.replace(/\./g, "").replace(/-/g, "");
  if (clean.length < 2) return rut;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const rev = body.split("").reverse().join("");
  const chunks = rev.match(/.{1,3}/g) ?? [];
  const dotted = chunks.join(".").split("").reverse().join("");
  return `${dotted}-${dv}`;
}
