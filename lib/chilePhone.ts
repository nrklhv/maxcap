/** Acepta 9XXXXXXXX o 569XXXXXXXXX (solo dígitos tras normalizar). */
export function isChileMobile(value: string): boolean {
  const d = value.replace(/\D/g, "");
  if (d.length === 9 && /^9\d{8}$/.test(d)) return true;
  if (d.length === 11 && /^569\d{8}$/.test(d)) return true;
  return false;
}
