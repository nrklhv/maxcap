// =============================================================================
// /broker/referidos — Vista del pipeline de referidos del broker
// =============================================================================
//
// Muestra los `BrokerLead` atribuidos a este broker (los que llegaron al
// landing con `?ref=BRK-XXX` y llenaron el form). Distinto de
// `/broker/inversionistas` que muestra cuentas YA cliente patrocinadas
// (sponsorship).
//
// Diferencias respecto al dashboard inversionista (`ReferralsCard`):
//   • Comisión variable → SIN montos en UI (staff registra al pagar).
//   • Stats funnel visible (NEW → SIGNED_UP → QUALIFIED → CONTRACT_SIGNED + LOST).
//   • Texto del header NO promete cifra fija — solo "comisión acordada".
//
// Detalle del programa: docs/DATABASE.md sección "Atribución de referidos".
// =============================================================================

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import {
  ensureBrokerReferralCode,
  safeRunReferralHook,
} from "@/lib/services/referral.service";
import {
  BrokerLeadsCard,
  type BrokerLeadRow,
} from "@/components/broker/BrokerLeadsCard";

/**
 * Misma convención que `dashboard/page.tsx`. Configurable vía
 * `NEXT_PUBLIC_LANDING_URL` para previews.
 */
function getLandingBaseUrl(): string {
  const env = process.env.NEXT_PUBLIC_LANDING_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  return "https://www.maxrent.cl";
}

export default async function BrokerReferidosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/broker/referidos");

  if (session.user.brokerAccessStatus !== "APPROVED") {
    redirect("/broker");
  }

  const [currentUser, brokerLeads] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { brokerReferralCode: true, brokerAccessStatus: true },
    }),
    prisma.brokerLead.findMany({
      where: { brokerUserId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        prospectEmail: true,
        status: true,
        signedUpAt: true,
        contractSignedAt: true,
        expiresAt: true,
        payoutStatus: true,
        paidAt: true,
        createdAt: true,
      },
    }),
  ]);

  // Lazy fix: si el broker no tiene `brokerReferralCode` (caso edge: cuenta
  // aprobada antes del PR de generación, o hook approveBroker falló),
  // generamos uno ahora. Si falla → ocultamos el card.
  let code = currentUser?.brokerReferralCode ?? null;
  if (!code && currentUser?.brokerAccessStatus === "APPROVED") {
    code = await safeRunReferralHook(
      "broker/referidos:ensureBrokerReferralCode",
      () => ensureBrokerReferralCode(session.user.id!)
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-broker-navy">
          Mis referidos
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-broker-muted">
          Prospects que llegaron al Club a través de tu link único. Ves el
          embudo completo (lead → cuenta creada → calificado → escrituró) y el
          tiempo que cada prospect tiene para escriturar antes de que la
          atribución venza.
        </p>
      </div>

      {code ? (
        <BrokerLeadsCard
          code={code}
          brokerLeads={brokerLeads as BrokerLeadRow[]}
          landingBaseUrl={getLandingBaseUrl()}
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-broker-muted">
          No pudimos generar tu código de referido. Recargá la página o
          contactá al equipo si persiste.
        </div>
      )}
    </div>
  );
}
