/** Base URL for canonicals, OG, sitemap (no trailing slash). */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export function getMetadataBase(): URL {
  return new URL(`${getSiteUrl()}/`);
}

/**
 * URL del portal (sin slash final). Se usa para enviar leads y redirigir
 * al usuario después del form. Configurable vía NEXT_PUBLIC_PORTAL_URL.
 */
export function getPortalUrl(): string {
  const raw = process.env.NEXT_PUBLIC_PORTAL_URL?.trim() || "https://portal.maxrent.cl";
  return raw.replace(/\/$/, "");
}
