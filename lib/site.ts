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

// =============================================================================
// Club de Inversionistas Calificados — fechas del lanzamiento
// =============================================================================
// Editar aquí si los plazos del Club cambian. El landing y el portal
// consumen estas constantes vía `lib/clubPhase.ts`.

/** Apertura oficial del Club: empiezan a tomarse reservas formales. */
export const CLUB_OPEN_DATE = new Date("2026-06-01T00:00:00-04:00");

/** Cierre del Club: 120 días después de la apertura. Después, no se aceptan
 *  reservas nuevas hasta que MaxRent decida abrir un nuevo Club. */
export const CLUB_CLOSE_DATE = new Date("2026-09-28T23:59:59-04:00");

/** Cupos totales del Club (también referenciado en copy del landing). */
export const CLUB_TOTAL_SLOTS = 100;
