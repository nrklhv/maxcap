/**
 * Pretty-print phone for read-only UI (aligned with investor portal).
 *
 * @domain maxrent-portal / portal
 * @pure
 */

export function formatPhoneForDisplay(phone: string | null | undefined): string {
  if (!phone?.trim()) return "—";
  const d = phone.replace(/\D/g, "");
  let n = d;
  if (n.startsWith("56")) n = n.slice(2);
  if (n.length !== 9) return phone;
  return `+56 ${n[0]} ${n.slice(1, 5)} ${n.slice(5)}`;
}
