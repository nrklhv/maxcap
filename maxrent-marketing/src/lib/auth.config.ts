// =============================================================================
// NextAuth.js v5 — Edge-safe Configuration (marketing.maxrent.cl)
// =============================================================================
//
// Pattern oficial: https://authjs.dev/guides/edge-compatibility
// Esta config la importa el middleware (Edge Runtime). Los providers reales
// viven en `auth.ts` (Node runtime).
//
// Acceso restringido por:
//   1. Super-admins via `MARKETING_SUPER_ADMINS` (env var, CSV) — siempre entran.
//   2. Allowlist en BD (tabla `marketing_access` en la Neon del portal),
//      gestionable desde `/admin`.
//   3. Fallback `MARKETING_ALLOWED_EMAILS` (env var) para dev local sin DB.
// =============================================================================

import type { NextAuthConfig } from "next-auth";
import { isEmailAllowed } from "./marketing-access";

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
      return await isEmailAllowed(email);
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
