// =============================================================================
// NextAuth.js v5 — Edge-safe Configuration
// =============================================================================
//
// Esta config NO toca Prisma ni APIs Node-only. La importa el middleware
// (que corre en Edge Runtime) y la extiende `auth.ts` agregando adapter Prisma,
// providers reales y callbacks que tocan BD.
//
// Pattern oficial: https://authjs.dev/guides/edge-compatibility
// =============================================================================

import type { NextAuthConfig } from "next-auth";
import type { BrokerAccessStatus, StaffRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      canInvest: boolean;
      staffRole: StaffRole;
      onboardingCompleted: boolean;
      brokerAccessStatus: BrokerAccessStatus | null;
    };
  }
}

export type AppJwt = {
  id?: string;
  /** Email en minúsculas; Resend/magic link a veces ponen el correo en `sub`, no el id de Prisma */
  email?: string | null;
  canInvest?: boolean;
  staffRole?: StaffRole;
  onboardingCompleted?: boolean;
  brokerAccessStatus?: BrokerAccessStatus | null;
};

// ────────────────────────────────────────────────────────────────────────────
// Helpers Edge-safe (solo leen process.env, no usan Node-only APIs ni BD)
// ────────────────────────────────────────────────────────────────────────────

/** True while Next is compiling (incl. workers where NEXT_PHASE is unset). */
function isLikelyNextBuildPhase(): boolean {
  if (process.env.NEXT_PHASE === "phase-production-build") return true;
  if (process.env.npm_lifecycle_event === "build") return true;
  // process.argv no existe en Edge Runtime; lo chequeamos defensivamente.
  const argv = (globalThis as { process?: { argv?: string[] } }).process?.argv;
  if (!Array.isArray(argv) || !argv.includes("build")) return false;
  return argv.some(
    (a) =>
      typeof a === "string" &&
      (a.includes("node_modules/next/") ||
        a.includes("node_modules\\next\\") ||
        a.endsWith("/next") ||
        a.endsWith("\\next.exe"))
  );
}

function resolveAuthSecret(): string {
  const fromEnv =
    process.env.NEXTAUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production" && isLikelyNextBuildPhase()) {
    return "maxrent-next-build-placeholder-not-used-at-runtime";
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Set NEXTAUTH_SECRET or AUTH_SECRET for production.");
  }
  return "maxrent-dev-placeholder-secret-not-for-production";
}

export function staffSuperAdminAllowlist(): Set<string> {
  const raw = process.env.STAFF_SUPER_ADMIN_EMAILS?.trim();
  if (!raw) return new Set();
  const parts = raw.split(/[,;\s]+/).map((e) => e.trim().toLowerCase());
  return new Set(parts.filter(Boolean));
}

/**
 * Whitelist de emails autorizados durante el beta cerrado del portal.
 * Si la env var `PORTAL_BETA_ALLOWED_EMAILS` no está definida o está vacía,
 * el portal opera **sin restricciones** (modo abierto, default en dev).
 */
function betaAllowlist(): Set<string> | null {
  const raw = process.env.PORTAL_BETA_ALLOWED_EMAILS?.trim();
  if (!raw) return null;
  const parts = raw.split(/[,;\s]+/).map((e) => e.trim().toLowerCase());
  const set = new Set(parts.filter(Boolean));
  return set.size > 0 ? set : null;
}

function isBetaSignInAllowed(email: string | null | undefined): boolean {
  const allow = betaAllowlist();
  if (!allow) return true;
  const e = email?.trim().toLowerCase();
  if (!e) return false;
  if (allow.has(e)) return true;
  if (staffSuperAdminAllowlist().has(e)) return true;
  return false;
}

function isSafeInternalCallback(callback: string | null): callback is string {
  return Boolean(callback && callback.startsWith("/") && !callback.startsWith("//"));
}

// ────────────────────────────────────────────────────────────────────────────
// Config Edge-safe (sin providers reales, sin adapter, sin callbacks que tocan BD)
// ────────────────────────────────────────────────────────────────────────────

export const authConfig = {
  trustHost: true,
  secret: resolveAuthSecret(),

  // Los providers reales se setean en `auth.ts` (donde está disponible Prisma).
  providers: [],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async signIn({ user, profile }) {
      // Beta cerrado: si PORTAL_BETA_ALLOWED_EMAILS está definida, solo esos emails entran.
      // Sin la env (default) el comportamiento es abierto. Edge-safe (solo lee env).
      const email = user?.email ?? profile?.email ?? null;
      if (!isBetaSignInAllowed(email)) {
        return false;
      }
      return true;
    },

    async session({ session, token }) {
      const t = token as AppJwt;
      const sub = typeof token.sub === "string" ? token.sub : undefined;
      const stableId =
        t.id || (sub && !sub.includes("@") && sub.length >= 20 ? sub : undefined);
      if (stableId) {
        session.user.id = stableId;
      }
      session.user.canInvest = t.canInvest ?? true;
      session.user.staffRole = t.staffRole ?? "NONE";
      session.user.onboardingCompleted = t.onboardingCompleted ?? false;
      session.user.brokerAccessStatus = t.brokerAccessStatus ?? null;
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {
        // URL inválida → fallback al baseUrl
      }
      return baseUrl;
    },
  },
} satisfies NextAuthConfig;

export { isSafeInternalCallback };
