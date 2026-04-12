/** Clave de sessionStorage: primer toque de atribución por pestaña. */
export const MARKETING_ATTRIBUTION_STORAGE_KEY = "maxrent_marketing_attribution_v1";

const MAX_LEN = {
  utm: 256,
  referrer: 2048,
  landingPath: 512,
  clickId: 512,
} as const;

export type MarketingAttributionPayload = {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  referrer?: string | null;
  landing_path?: string | null;
  captured_at?: string | null;
};

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max);
}

function pickParam(searchParams: URLSearchParams, key: string): string | null {
  const v = searchParams.get(key);
  if (v == null || v === "") return null;
  return truncate(v.trim(), MAX_LEN.utm);
}

/**
 * Si aún no hay snapshot en sessionStorage, guarda first-touch desde la URL actual y referrer.
 * Idempotente por pestaña: no sobrescribe si ya existe.
 */
export function captureFirstTouchFromUrl(): void {
  if (typeof window === "undefined") return;

  try {
    if (sessionStorage.getItem(MARKETING_ATTRIBUTION_STORAGE_KEY)) return;
  } catch {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const payload: MarketingAttributionPayload = {
    utm_source: pickParam(params, "utm_source"),
    utm_medium: pickParam(params, "utm_medium"),
    utm_campaign: pickParam(params, "utm_campaign"),
    utm_term: pickParam(params, "utm_term"),
    utm_content: pickParam(params, "utm_content"),
    gclid: pickParam(params, "gclid"),
    fbclid: pickParam(params, "fbclid"),
    landing_path: truncate(window.location.pathname || "/", MAX_LEN.landingPath),
    captured_at: new Date().toISOString(),
  };

  const ref = typeof document !== "undefined" ? document.referrer : "";
  if (ref) {
    payload.referrer = truncate(ref, MAX_LEN.referrer);
  }

  try {
    sessionStorage.setItem(MARKETING_ATTRIBUTION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* private mode / quota */
  }
}

export function readStoredAttribution(): MarketingAttributionPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(MARKETING_ATTRIBUTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as MarketingAttributionPayload;
  } catch {
    return null;
  }
}
