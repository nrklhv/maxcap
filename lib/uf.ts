/**
 * Server-side fetcher de la UF del día, leída del endpoint público del portal.
 *
 * El portal cachea la UF diariamente vía cron y la expone en
 * `GET /api/public/uf-rate`. Esta landing la consume desde Server Components
 * (Header) con cache HTTP de Next de 30 min (`next: { revalidate: 1800 }`)
 * para no pegar al portal en cada page load.
 *
 * Si el portal no responde, devuelve `null` silenciosamente — la UI omite el
 * badge sin romper la página. NUNCA queremos que la landing falle por la UF.
 *
 * @see docs portal: `maxrent-portal/docs/UF_RATE.md`
 */

import { getPortalUrl } from "./site";

export interface UfRate {
  date: string; // "YYYY-MM-DD"
  valueClp: number;
  source: string;
}

/**
 * Trae la UF más reciente del portal. Si falla (timeout, 5xx, body raro),
 * devuelve `null` y loguea — la landing sigue funcionando sin badge.
 *
 * Cache: 30 min en el data cache de Next (CDN + memory). La UF cambia 1 vez
 * al día, no necesita estar más fresca.
 */
export async function fetchLatestUf(): Promise<UfRate | null> {
  const url = `${getPortalUrl()}/api/public/uf-rate`;
  try {
    const res = await fetch(url, {
      // Cache HTTP de Next — 30 min. La UF se mueve ~0,01%/día.
      next: { revalidate: 1800 },
      // Cap de seguridad por si el portal está caído.
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) {
      // 4xx/5xx → no rompemos la landing, solo logueamos.
      console.warn(`[uf] portal devolvió ${res.status} en ${url}`);
      return null;
    }
    const body = (await res.json()) as { uf: UfRate | null };
    if (!body.uf || typeof body.uf.valueClp !== "number" || !body.uf.date) {
      return null;
    }
    return body.uf;
  } catch (err) {
    // Network, timeout, JSON parse — todo silencioso. Sin badge.
    console.warn("[uf] error al traer UF del portal:", err);
    return null;
  }
}
