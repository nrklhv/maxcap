// =============================================================================
// Cliente Postgres (Neon serverless) — comparte la DB del portal
// =============================================================================
//
// La app de marketing NO tiene su propia DB. Reutiliza la Neon del portal a
// través del driver `@neondatabase/serverless` (HTTP-based, Edge-safe).
//
// Solo se accede a la tabla `marketing_access` (allowlist de correos). Las
// migraciones viven en el portal (`maxrent-portal/prisma/`) — esta app no usa
// Prisma para mantener el bundle chico.
//
// Necesita la env var `DATABASE_URL` (la misma que usa el portal).
// =============================================================================

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let _sql: NeonQueryFunction<false, false> | null = null;

/** Devuelve el cliente neon, lazy-init para que el módulo no falle al importarse en build. */
export function getSql(): NeonQueryFunction<false, false> {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL no está definida. Configurá la env var en Vercel apuntando a la misma Neon que usa el portal."
    );
  }
  _sql = neon(url);
  return _sql;
}
