/**
 * Pill sutil con la UF del día, mostrado en el header de la landing.
 *
 * Server Component async — fetchea la UF del portal con cache HTTP de 30 min.
 * Si no hay UF disponible (portal caído, post-deploy fresco sin cron) no
 * renderiza nada para no agregar ruido al header.
 *
 * Solo visible en desktop (`hidden md:inline-flex`). El header mobile ya está
 * apretado y la UF es info nice-to-have, no crítica.
 */

import { fetchLatestUf } from "@/lib/uf";
import { formatUfBadge } from "@/lib/ufFormat";

export async function UfBadge() {
  const uf = await fetchLatestUf();
  if (!uf) return null;

  return (
    <span
      className="hidden items-center rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-white/60 ring-1 ring-white/10 md:inline-flex"
      title={`UF al ${uf.date} · fuente: ${uf.source}`}
    >
      {formatUfBadge(uf.valueClp)}
    </span>
  );
}
