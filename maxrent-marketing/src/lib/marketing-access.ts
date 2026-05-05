// =============================================================================
// Allowlist de correos autorizados para marketing.maxrent.cl
// =============================================================================
//
// Dos capas:
//  1. Super-admins (env var `MARKETING_SUPER_ADMINS`, CSV) — siempre pueden
//     entrar y acceden a `/admin` para gestionar la lista. No se almacenan en
//     BD para evitar bootstrap problem.
//  2. Allowlist en BD (tabla `marketing_access` en la Neon del portal) —
//     editable desde la UI de admin.
//
// Fallback: env var `MARKETING_ALLOWED_EMAILS` (CSV) sigue funcionando para
// dev local sin DB. Si DATABASE_URL no está definida, se usa solo el fallback.
// =============================================================================

import { getSql } from "./db";

export type MarketingAccessRow = {
  id: string;
  email: string;
  addedBy: string | null;
  note: string | null;
  createdAt: Date;
};

function parseEmailList(raw: string | undefined | null): Set<string> {
  if (!raw) return new Set();
  const parts = raw
    .trim()
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return new Set(parts);
}

export function superAdminEmails(): Set<string> {
  return parseEmailList(process.env.MARKETING_SUPER_ADMINS);
}

export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return superAdminEmails().has(email.trim().toLowerCase());
}

/** Lista todos los correos autorizados desde la BD (ordenados alfabéticamente). */
export async function listAllowedEmails(): Promise<MarketingAccessRow[]> {
  if (!process.env.DATABASE_URL?.trim()) return [];
  const sql = getSql();
  const rows = (await sql`
    SELECT id, email, "addedBy", note, "createdAt"
    FROM marketing_access
    ORDER BY email ASC
  `) as MarketingAccessRow[];
  return rows;
}

/** Agrega un correo a la allowlist. Idempotente — si ya existe, no falla. */
export async function addAllowedEmail(
  email: string,
  options?: { addedBy?: string | null; note?: string | null }
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) {
    throw new Error("Correo inválido");
  }
  const sql = getSql();
  await sql`
    INSERT INTO marketing_access (id, email, "addedBy", note)
    VALUES (
      ${cuidLike()},
      ${normalized},
      ${options?.addedBy ?? null},
      ${options?.note ?? null}
    )
    ON CONFLICT (email) DO NOTHING
  `;
}

/** Quita un correo de la allowlist. Idempotente — si no existe, no falla. */
export async function removeAllowedEmail(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const sql = getSql();
  await sql`DELETE FROM marketing_access WHERE email = ${normalized}`;
}

/**
 * Validación al sign-in. Devuelve true si:
 *  - El email está en MARKETING_SUPER_ADMINS, OR
 *  - El email está en la tabla marketing_access, OR
 *  - El email está en MARKETING_ALLOWED_EMAILS (fallback dev local)
 */
export async function isEmailAllowed(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  if (!e) return false;

  if (superAdminEmails().has(e)) return true;

  // Fallback env var legacy (útil en dev local sin DB).
  const fallback = parseEmailList(process.env.MARKETING_ALLOWED_EMAILS);
  if (fallback.has(e)) return true;

  // Lista en BD.
  if (process.env.DATABASE_URL?.trim()) {
    try {
      const sql = getSql();
      const rows = (await sql`
        SELECT 1 AS ok FROM marketing_access WHERE email = ${e} LIMIT 1
      `) as { ok: number }[];
      if (rows.length > 0) return true;
    } catch (err) {
      // Si la DB falla, log y deniega. Que el super-admin lo note.
      console.error("[marketing-access] error consultando BD:", err);
    }
  }

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// CUID-like id sin dependencia extra (usamos crypto.randomUUID con prefijo).
// La tabla pide un id no auto-generado por Postgres (matchea con el modelo de
// Prisma del portal que usa @default(cuid())).
// ─────────────────────────────────────────────────────────────────────────────
function cuidLike(): string {
  // Edge runtime tiene crypto disponible globalmente.
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `cma${uuid.replace(/-/g, "").slice(0, 22)}`;
}
