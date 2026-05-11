// =============================================================================
// Refiere y gana — Página dedicada del programa de referidos del inversionista
// =============================================================================
//
// Antes vivía como una card dentro de /dashboard. Movido a página propia para
// poder destacarlo desde el sidebar sin saturar el dashboard.
// =============================================================================

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ensureInvestorReferralCode,
  safeRunReferralHook,
} from "@/lib/services/referral.service";
import { ReferralsCard, type ReferralRow } from "@/components/portal/ReferralsCard";
import { redirect } from "next/navigation";

/**
 * Base URL del landing público para armar el link `?ref=<code>` que el
 * inversionista comparte. Configurable vía env (preview/QA), default a prod.
 */
function getLandingBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_LANDING_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  return "https://www.maxrent.cl";
}

export default async function ReferidosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [currentUser, referrals] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { investorReferralCode: true, canInvest: true },
    }),
    prisma.referral.findMany({
      where: { referrerUserId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        referredEmail: true,
        status: true,
        signedUpAt: true,
        signedAt: true,
        expiresAt: true,
        rewardCLP: true,
        payoutStatus: true,
        paidAt: true,
        createdAt: true,
      },
    }),
  ]);

  // Lazy-create del code si el User no lo tiene (cuenta antigua o hook falló).
  let referralCode = currentUser?.investorReferralCode ?? null;
  if (!referralCode && currentUser?.canInvest) {
    referralCode = await safeRunReferralHook(
      "referidos:ensureInvestorReferralCode",
      () => ensureInvestorReferralCode(session.user.id!)
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl tracking-tight text-dark">
          Refiere y gana
        </h1>
        <p className="mt-1 text-gray-600 text-sm">
          Por cada amigo que se inscriba y escriture, recibes $500.000.
        </p>
      </div>

      {referralCode ? (
        <ReferralsCard
          code={referralCode}
          referrals={referrals as ReferralRow[]}
          landingBaseUrl={getLandingBaseUrl()}
        />
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          El programa de referidos está disponible solo para inversionistas con
          acceso al portal. Si crees que deberías tenerlo, contáctanos.
        </div>
      )}
    </div>
  );
}
