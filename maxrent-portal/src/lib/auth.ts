// =============================================================================
// NextAuth.js v5 Configuration
// =============================================================================

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
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

type AppJwt = {
  id?: string;
  /** Email en minúsculas; Resend/magic link a veces ponen el correo en `sub`, no el id de Prisma */
  email?: string | null;
  canInvest?: boolean;
  staffRole?: StaffRole;
  onboardingCompleted?: boolean;
  brokerAccessStatus?: BrokerAccessStatus | null;
};

/** Emails con rol staff vía env (coma o espacio). Útil en dev / primer admin sin tocar BD. */
function staffSuperAdminAllowlist(): Set<string> {
  const raw = process.env.STAFF_SUPER_ADMIN_EMAILS?.trim();
  if (!raw) return new Set();
  const parts = raw.split(/[,;\s]+/).map((e) => e.trim().toLowerCase());
  return new Set(parts.filter(Boolean));
}

function resolveJwtUserId(
  user: { id?: string } | undefined,
  token: { sub?: string | null; id?: string }
): string | undefined {
  const fromUser = user?.id;
  if (fromUser) return fromUser;
  if (typeof token.id === "string" && token.id) return token.id;
  if (typeof token.sub === "string" && token.sub) return token.sub;
  return undefined;
}

function buildAuthProviders() {
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

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    providers.push(
      Resend({
        apiKey: resendKey,
        from: process.env.EMAIL_FROM || "MaxRent <noreply@maxrent.cl>",
      })
    );
  }

  const isNonProd = process.env.NODE_ENV !== "production";
  if (isNonProd && providers.length === 0) {
    providers.push(
      Credentials({
        id: "dev-credentials",
        name: "Email (solo desarrollo)",
        credentials: {
          email: { label: "Email", type: "email" },
        },
        async authorize(credentials) {
          const raw = credentials?.email as string | undefined;
          const email = raw?.trim().toLowerCase();
          if (!email?.includes("@")) return null;

          let user = await prisma.user.findUnique({ where: { email } });
          if (!user) {
            user = await prisma.user.create({
              data: {
                email,
                name: email.split("@")[0],
                emailVerified: new Date(),
                canInvest: true,
                staffRole: "NONE",
              },
            });
            await prisma.profile.create({ data: { userId: user.id } });
            const existingLead = await prisma.lead.findUnique({
              where: { email },
            });
            if (existingLead) {
              await prisma.user.update({
                where: { id: user.id },
                data: { leadId: existingLead.id },
              });
            }
          } else {
            const profile = await prisma.profile.findUnique({
              where: { userId: user.id },
            });
            if (!profile) {
              await prisma.profile.create({ data: { userId: user.id } });
            }
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        },
      })
    );
  }

  if (providers.length === 0) {
    providers.push(
      Google({
        clientId:
          process.env.GOOGLE_CLIENT_ID?.trim() || "__missing_GOOGLE_CLIENT_ID__",
        clientSecret:
          process.env.GOOGLE_CLIENT_SECRET?.trim() ||
          "__missing_GOOGLE_CLIENT_SECRET__",
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

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),

  providers: buildAuthProviders(),

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      const t = token as AppJwt;
      const u = user as { id?: string; email?: string | null } | undefined;

      if (u?.id) t.id = u.id;
      if (u?.email) t.email = u.email.trim().toLowerCase();

      const resolvedFromToken = resolveJwtUserId(user, token);
      // Solo usar como id de Prisma si parece cuid (no es un email en `sub`).
      if (resolvedFromToken && !resolvedFromToken.includes("@")) {
        t.id = resolvedFromToken;
      } else if (resolvedFromToken?.includes("@")) {
        t.email = t.email ?? resolvedFromToken.trim().toLowerCase();
      }

      const tokenAny = token as { email?: string | null };
      const emailHint =
        (typeof t.email === "string" && t.email) ||
        (typeof tokenAny.email === "string" && tokenAny.email
          ? tokenAny.email.trim().toLowerCase()
          : "") ||
        "";

      const includeProfile = {
        profile: { select: { onboardingCompleted: true } },
      };

      try {
        let dbUser =
          t.id && !String(t.id).includes("@")
            ? await prisma.user.findUnique({
                where: { id: t.id },
                include: includeProfile,
              })
            : null;

        if (!dbUser && emailHint) {
          dbUser = await prisma.user.findUnique({
            where: { email: emailHint },
            include: includeProfile,
          });
        }

        if (dbUser) {
          t.id = dbUser.id;
          t.email = dbUser.email?.trim().toLowerCase() ?? t.email;
          t.canInvest = dbUser.canInvest;
          const allow = staffSuperAdminAllowlist();
          const email = dbUser.email?.trim().toLowerCase();
          t.staffRole =
            email && allow.has(email) ? "SUPER_ADMIN" : dbUser.staffRole;
          t.onboardingCompleted = dbUser.profile?.onboardingCompleted ?? false;
          t.brokerAccessStatus = dbUser.brokerAccessStatus ?? null;
        }
      } catch {
        // No romper el flujo de login si Prisma falla en este paso
      }

      if (trigger === "update" && session) {
        t.onboardingCompleted =
          session.onboardingCompleted ?? t.onboardingCompleted;
      }

      return token;
    },

    async session({ session, token }) {
      const t = token as AppJwt;
      const sub = typeof token.sub === "string" ? token.sub : undefined;
      const stableId =
        t.id ||
        (sub && !sub.includes("@") && sub.length >= 20 ? sub : undefined);
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
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  events: {
    async createUser({ user }) {
      if (!user.id) return;
      // Upsert: el adapter u otros flujos pueden dejar perfil existente; un 2º create rompe OAuth.
      await prisma.profile.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
      });

      if (user.email) {
        const existingLead = await prisma.lead.findUnique({
          where: { email: user.email },
        });
        if (existingLead) {
          await prisma.user.update({
            where: { id: user.id },
            data: { leadId: existingLead.id },
          });
        }
      }
    },
  },
});
