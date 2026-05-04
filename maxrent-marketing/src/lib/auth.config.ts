// =============================================================================
// NextAuth.js v5 — Edge-safe Configuration (marketing.maxrent.cl)
// =============================================================================
//
// Pattern oficial: https://authjs.dev/guides/edge-compatibility
// Esta config la importa el middleware (Edge Runtime). Los providers reales
// viven en `auth.ts` (Node runtime).
//
// Acceso restringido por allowlist en `MARKETING_ALLOWED_EMAILS` (env var).
// Sin allowlist definida → app cerrada (nadie entra). Por diseño.
// =============================================================================

import type { NextAuthConfig } from "next-auth";

function isLikelyNextBuildPhase(): boolean {
  if (process.env.NEXT_PHASE === "phase-production-build") return true;
  if (process.env.npm_lifecycle_event === "build") return true;
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
    return "maxrent-marketing-build-placeholder";
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Set NEXTAUTH_SECRET or AUTH_SECRET for production.");
  }
  return "maxrent-marketing-dev-placeholder";
}

export function marketingAllowlist(): Set<string> {
  const raw = process.env.MARKETING_ALLOWED_EMAILS?.trim();
  if (!raw) return new Set();
  const parts = raw.split(/[,;\s]+/).map((e) => e.trim().toLowerCase());
  return new Set(parts.filter(Boolean));
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  const allow = marketingAllowlist();
  if (allow.size === 0) return false;
  const e = email?.trim().toLowerCase();
  return !!e && allow.has(e);
}

export const authConfig = {
  trustHost: true,
  secret: resolveAuthSecret(),

  providers: [],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  pages: {
    signIn: "/signin",
    error: "/signin",
  },

  callbacks: {
    async signIn({ user, profile }) {
      const email = user?.email ?? profile?.email ?? null;
      return isAllowedEmail(email);
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
