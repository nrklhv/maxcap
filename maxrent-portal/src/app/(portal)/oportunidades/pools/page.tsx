/**
 * `/oportunidades/pools` quedó consolidado en `/oportunidades` (redesign del
 * 2026-05-17). Como el MVP solo ofrece pools, no hay razón para mantener dos
 * URLs distintas. Redirect aquí por compatibilidad con links viejos.
 *
 * El detalle de un pool (`/oportunidades/pools/[slug]`) sigue funcionando como
 * siempre — la lista vive ahora en `/oportunidades`.
 */

import { redirect } from "next/navigation";

export default function PoolsListPageRedirect() {
  redirect("/oportunidades");
}
