// =============================================================================
// Atribución de referidos — captura del code en cookie del browser
// =============================================================================
//
// Cuando alguien visita el landing con `?ref=INV-XXXXXX` o `?ref=BRK-XXXXXX`,
// guardamos el code en una cookie `mxr_ref` por 60 días con política
// **first-touch**: si la cookie ya existe (visita anterior), NO la
// sobrescribimos. Esto asegura que la primera atribución manda — un usuario
// que vuelve días después con otro `?ref=` queda atribuido al primero.
//
// La cookie se LEE en el form al hacer submit, y se manda al endpoint del
// portal (`/api/public/leads`) como campo `referral_code` del body. El portal
// es quien valida que el code corresponda a un User real (`investorReferralCode`
// o `brokerReferralCode`) y persiste la atribución en `Lead.marketingAttribution`.
//
// Se diferencia del módulo `marketingAttribution.ts` (UTMs) en dos cosas:
//   • Storage: cookie persistente vs sessionStorage por pestaña.
//   • TTL: 60 días vs vida de sesión.
//
// Detalle del sistema completo: docs/DATABASE.md sección "Atribución de referidos".
// =============================================================================

/** Nombre de la cookie usada para persistir el code de referido. */
export const REFERRAL_COOKIE_NAME = "mxr_ref";

/** Días de vida de la cookie desde el primer hit con `?ref=`. */
export const REFERRAL_TTL_DAYS = 60;

/**
 * Formato válido: prefijo `INV-` o `BRK-` + 6+ caracteres alfanuméricos.
 * Case-insensitive en lectura, lo normalizamos a uppercase al guardar.
 */
export const REFERRAL_CODE_PATTERN = /^(INV|BRK)-[A-Z0-9]{6,32}$/;

/**
 * Lee la cookie y devuelve el code si es válido, null si no existe o no parsea.
 * Safe en SSR (devuelve null si no hay `document`).
 */
export function readReferralCode(): string | null {
  if (typeof document === "undefined") return null;
  try {
    const all = document.cookie.split(";");
    for (const c of all) {
      const eq = c.indexOf("=");
      if (eq < 0) continue;
      const name = c.slice(0, eq).trim();
      if (name !== REFERRAL_COOKIE_NAME) continue;
      const raw = decodeURIComponent(c.slice(eq + 1));
      const upper = raw.trim().toUpperCase();
      if (!REFERRAL_CODE_PATTERN.test(upper)) return null;
      return upper;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Si aún no hay cookie de referido, lee `?ref=` de la URL actual, valida el
 * prefijo (INV-/BRK-) y la guarda con TTL = 60 días. Idempotente: NO sobrescribe
 * la cookie si ya existe (política first-touch).
 *
 * Se llama desde el componente `<MarketingAttributionCapture />` en el arranque
 * de la app del landing (cliente).
 */
export function captureFirstTouchReferralFromUrl(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  // First-touch: si ya existe cookie con valor válido, no la pisamos.
  if (readReferralCode() != null) return;

  const params = new URLSearchParams(window.location.search);
  const raw = params.get("ref");
  if (raw == null) return;

  const upper = raw.trim().toUpperCase();
  if (!REFERRAL_CODE_PATTERN.test(upper)) return;

  // Cookie de 60 días en el dominio root para que funcione en `www.maxrent.cl`,
  // `maxrent.cl` y futuros subdominios públicos (no portal — el portal usa otro
  // dominio y no comparte cookies con el landing).
  const maxAgeSeconds = REFERRAL_TTL_DAYS * 24 * 60 * 60;
  const isHttps =
    typeof window.location !== "undefined" &&
    window.location.protocol === "https:";

  // En localhost no agregamos `Secure` ni `Domain`; en producción sí.
  const parts = [
    `${REFERRAL_COOKIE_NAME}=${encodeURIComponent(upper)}`,
    `Max-Age=${maxAgeSeconds}`,
    "Path=/",
    "SameSite=Lax",
  ];
  if (isHttps) parts.push("Secure");

  try {
    document.cookie = parts.join("; ");
  } catch {
    /* private mode / quota — silencioso, no rompe la UX. */
  }
}
