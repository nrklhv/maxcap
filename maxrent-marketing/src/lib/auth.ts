// =============================================================================
// NextAuth.js v5 — Node runtime (marketing.maxrent.cl)
// =============================================================================
//
// Extiende `auth.config.ts` (Edge-safe) con el provider de Google.
// Sin Prisma adapter: la app de marketing no tiene BD propia ni tabla de
// usuarios — la autorización vive 100% en `MARKETING_ALLOWED_EMAILS`.
// =============================================================================

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { authConfig } from "./auth.config";

function ensureAuthSecretEnv(): void {
  const secret = authConfig.secret as string;
  if (!process.env.AUTH_SECRET?.trim()) process.env.AUTH_SECRET = secret;
  if (!process.env.NEXTAUTH_SECRET?.trim()) process.env.NEXTAUTH_SECRET = secret;
}

ensureAuthSecretEnv();

function buildProviders() {
  const providers = [];

  const googleId = process.env.GOOGLE_CLIENT_ID?.trim();
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (googleId && googleSecret) {
    providers.push(
      Google({
        clientId: googleId,
        clientSecret: googleSecret,
        authorization: {
          params: {
            prompt: "select_account",
          },
        },
      })
    );
  }

  return providers;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: buildProviders(),
});
