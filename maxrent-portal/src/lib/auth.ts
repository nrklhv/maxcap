// =============================================================================
// NextAuth.js v5 Configuration (Node runtime)
// =============================================================================
//
// Extiende `auth.config.ts` (Edge-safe) con:
//   - Adapter Prisma
//   - Providers reales (Google + Resend + Credentials dev)
//   - Callback `jwt` que enriquece el token con datos de BD
//   - Event `createUser` (Profile + Lead linking)
//
// El middleware NO importa este archivo (importa `auth.config.ts` directo)
// para mantener el bundle Edge bajo el límite de 1 MB.
// =============================================================================

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { Prisma } from "@prisma/client";
import { isInvestorPerfilCompleteForPortal } from "@/lib/portal/profile-labor";
import {
  backfillUserNotifications,
  notifyTemplate,
} from "@/lib/services/notifications";
import { prisma } from "./prisma";
import { authConfig, staffSuperAdminAllowlist, type AppJwt } from "./auth.config";

/**
 * Auth.js middleware (Edge) resolves `AUTH_SECRET` from `process.env`. Mirror the resolved
 * secret there so MissingSecret does not occur when only `secret` is passed to NextAuth().
 */
function ensureAuthSecretEnv(): void {
  const secret = authConfig.secret as string;
  if (!process.env.AUTH_SECRET?.trim()) process.env.AUTH_SECRET = secret;
  if (!process.env.NEXTAUTH_SECRET?.trim()) process.env.NEXTAUTH_SECRET = secret;
}

ensureAuthSecretEnv();

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
        // El SDK del provider sigue requiriendo apiKey por tipos, pero al
        // sobreescribir `sendVerificationRequest` no se usa: el envío real
        // pasa por nuestra capa de notifications (templates + audit trail).
        apiKey: resendKey,
        from: process.env.EMAIL_FROM || "MaxRent <noreply@maxrent.cl>",
        async sendVerificationRequest(params) {
          const email = params.identifier.trim().toLowerCase();
          // Si ya existe User con este email, vinculamos la notificación.
          // Para magic links de signup (User aún no creado), userId queda null
          // y el `backfillUserNotifications` del evento createUser lo asocia.
          const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
          });

          // NextAuth pasa `expires` como Date; calculamos minutos para mostrar.
          const expiresMinutes = Math.max(
            1,
            Math.round(
              (params.expires.getTime() - Date.now()) / (60 * 1000)
            )
          );

          await notifyTemplate({
            template: "magic-link",
            to: email,
            userId: user?.id ?? null,
            variables: {
              url: params.url,
              email,
              expiresMinutes,
            },
          });
        },
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
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: buildAuthProviders(),
  callbacks: {
    ...authConfig.callbacks,

    async jwt({ token, user, trigger, session }) {
      const t = token as AppJwt;
      const u = user as { id?: string; email?: string | null } | undefined;

      if (u?.id) t.id = u.id;
      if (u?.email) t.email = u.email.trim().toLowerCase();

      const resolvedFromToken = resolveJwtUserId(user, token);
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
        profile: { select: { onboardingCompleted: true, additionalData: true } },
      };

      let profileSnapshot: {
        onboardingCompleted: boolean;
        additionalData: unknown;
      } | null = null;

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
          t.onboardingCompleted = isInvestorPerfilCompleteForPortal(dbUser.profile);
          t.brokerAccessStatus = dbUser.brokerAccessStatus ?? null;
          if (dbUser.profile) {
            profileSnapshot = {
              onboardingCompleted: dbUser.profile.onboardingCompleted,
              additionalData: dbUser.profile.additionalData,
            };
          }
        }
      } catch {
        // No romper el flujo de login si Prisma falla en este paso
      }

      if (trigger === "update" && session) {
        t.onboardingCompleted =
          session.onboardingCompleted ?? t.onboardingCompleted;
      }

      if (profileSnapshot) {
        t.onboardingCompleted = isInvestorPerfilCompleteForPortal(profileSnapshot);
      }

      return token;
    },
  },

  events: {
    async createUser({ user }) {
      if (!user.id) return;

      // Buscar el Lead correspondiente al email para vincular en el alta
      // y propagar la atribución de marketing al Profile.additionalData.
      const existingLead = user.email
        ? await prisma.lead.findUnique({
            where: { email: user.email.toLowerCase() },
            select: { id: true, marketingAttribution: true },
          })
        : null;

      // Si el Lead trae atribución de marketing (UTMs, gclid, etc.), la
      // sembramos en additionalData.marketingAttribution para uso en BI.
      const initialAdditionalData = existingLead?.marketingAttribution
        ? { marketingAttribution: existingLead.marketingAttribution }
        : undefined;

      await prisma.profile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          ...(initialAdditionalData
            ? { additionalData: initialAdditionalData as Prisma.InputJsonValue }
            : {}),
        },
        update: {},
      });

      if (existingLead) {
        await prisma.user.update({
          where: { id: user.id },
          data: { leadId: existingLead.id },
        });
      }

      // Backfill de notificaciones previas (welcome email enviado al lead
      // antes de tener cuenta) para que aparezcan en el timeline del User.
      if (user.email) {
        await backfillUserNotifications({
          userId: user.id,
          email: user.email,
        }).catch(() => {
          // Best-effort; no romper alta si falla.
        });
      }
    },
  },
});
