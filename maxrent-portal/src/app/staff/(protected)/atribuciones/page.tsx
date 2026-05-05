// =============================================================================
// /staff/atribuciones — Vista interna del sistema de referidos
// =============================================================================
//
// Tabs: Referrals (peer-to-peer) y BrokerLeads (comercial). Las dos tablas
// son intencionalmente separadas en DB; acá staff las ve lado a lado.
//
// Para cada fila staff puede:
//   • Ver el funnel completo del registro (creado → signedUp → qualified →
//     signed/contractSigned o expired/lost).
//   • Si está en "Pago pendiente", marcar como pagado con nota libre del
//     detalle de la transferencia (componente cliente `MarkPaidForm`).
//
// Stats agregados arriba de cada tabla para mirada rápida.
//
// Detalle del modelo: docs/DATABASE.md sección "Atribución de referidos".
// =============================================================================

import { redirect } from "next/navigation";
import Link from "next/link";

import { requireStaffSuperAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { MarkPaidForm } from "@/components/staff/MarkPaidForm";

type SearchParams = { tab?: string };

function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCLP(n: number): string {
  return n.toLocaleString("es-CL");
}

// -----------------------------------------------------------------------------
// Página
// -----------------------------------------------------------------------------

export default async function StaffAtribucionesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // requireStaffSuperAdmin valida session + staffRole === SUPER_ADMIN
  // (el JWT también incluye allowlist por env via staffSuperAdminAllowlist).
  const session = await requireStaffSuperAdmin();
  if (!session) redirect("/staff/login?callbackUrl=/staff/atribuciones");

  const tab = searchParams.tab === "broker-leads" ? "broker-leads" : "referrals";

  const [referrals, brokerLeads] = await Promise.all([
    prisma.referral.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        referrer: { select: { email: true, name: true } },
      },
    }),
    prisma.brokerLead.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        broker: { select: { email: true, name: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl tracking-tight text-gray-900">
          Atribución de referidos
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-600">
          Pipeline completo de los dos canales de atribución: peer-to-peer
          (inversionista refiere amigo, $500.000 fijo) y comercial (broker
          trae cliente, comisión variable). Acá registrás los pagos cuando
          procesás las transferencias.
        </p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <TabLink
          href="/staff/atribuciones?tab=referrals"
          active={tab === "referrals"}
          label={`Referrals (${referrals.length})`}
        />
        <TabLink
          href="/staff/atribuciones?tab=broker-leads"
          active={tab === "broker-leads"}
          label={`Broker Leads (${brokerLeads.length})`}
        />
      </div>

      {tab === "referrals" ? (
        <ReferralsTable referrals={referrals} />
      ) : (
        <BrokerLeadsTable brokerLeads={brokerLeads} />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Tab nav
// -----------------------------------------------------------------------------

function TabLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-orange text-orange"
          : "border-transparent text-gray-600 hover:text-gray-900"
      }`}
    >
      {label}
    </Link>
  );
}

// -----------------------------------------------------------------------------
// Tabla Referrals
// -----------------------------------------------------------------------------

type ReferralWithReferrer = {
  id: string;
  code: string;
  referrerUserId: string;
  referredEmail: string;
  referredUserId: string | null;
  status: string;
  signedUpAt: Date | null;
  signedAt: Date | null;
  expiresAt: Date;
  rewardCLP: number;
  payoutStatus: string;
  paidAt: Date | null;
  payoutNote: string | null;
  createdAt: Date;
  referrer: { email: string; name: string | null };
};

function ReferralsTable({ referrals }: { referrals: ReferralWithReferrer[] }) {
  const stats = computeReferralStats(referrals);

  return (
    <div className="space-y-4">
      <StatsRow
        items={[
          { label: "Activos", value: stats.active },
          { label: "Calificados", value: stats.QUALIFIED },
          { label: "Escrituraron", value: stats.SIGNED },
          { label: "Pago pendiente", value: stats.pendingPayout, tone: "warn" },
          { label: "Pagados", value: stats.PAID, tone: "ok" },
          { label: "Vencidos", value: stats.EXPIRED, tone: "muted" },
          {
            label: "Pendiente CLP",
            value: `$${formatCLP(stats.pendingPayoutCLP)}`,
            tone: "warn",
          },
          {
            label: "Pagado CLP",
            value: `$${formatCLP(stats.paidPayoutCLP)}`,
            tone: "ok",
          },
        ]}
      />

      {referrals.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          Todavía no hay referrals registrados.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <Th>Referidor</Th>
                <Th>Code</Th>
                <Th>Referido</Th>
                <Th>Status</Th>
                <Th>Reward</Th>
                <Th>Payout</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {referrals.map((r) => (
                <ReferralRow key={r.id} referral={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReferralRow({ referral }: { referral: ReferralWithReferrer }) {
  return (
    <tr className="text-sm text-gray-700">
      <Td>
        <div className="font-medium text-gray-900">
          {referral.referrer.name ?? "—"}
        </div>
        <div className="text-xs text-gray-500">{referral.referrer.email}</div>
      </Td>
      <Td>
        <code className="font-mono text-xs">{referral.code}</code>
      </Td>
      <Td>
        <div className="text-gray-900">{referral.referredEmail}</div>
        {referral.referredUserId ? (
          <div className="text-xs text-green-700">cuenta creada</div>
        ) : (
          <div className="text-xs text-gray-500">solo lead</div>
        )}
      </Td>
      <Td>
        <ReferralStatusBadge
          status={referral.status}
          signedUpAt={referral.signedUpAt}
          signedAt={referral.signedAt}
          expiresAt={referral.expiresAt}
          createdAt={referral.createdAt}
        />
      </Td>
      <Td>
        <div className="text-sm font-medium text-gray-900">
          ${formatCLP(referral.rewardCLP)}
        </div>
      </Td>
      <Td>
        <PayoutBadge
          payoutStatus={referral.payoutStatus}
          paidAt={referral.paidAt}
          payoutNote={referral.payoutNote}
        />
      </Td>
      <Td>
        {referral.status === "SIGNED" && referral.payoutStatus === "PENDING" ? (
          <MarkPaidForm
            endpoint={`/api/staff/referrals/${referral.id}/mark-paid`}
            placeholder="Ej: Transferencia BCI ref 12345 - 15-may-2026"
          />
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </Td>
    </tr>
  );
}

function computeReferralStats(rows: ReferralWithReferrer[]) {
  const stats = {
    active: 0, // PENDING + SIGNED_UP
    QUALIFIED: 0,
    SIGNED: 0,
    EXPIRED: 0,
    pendingPayout: 0,
    PAID: 0,
    pendingPayoutCLP: 0,
    paidPayoutCLP: 0,
  };
  for (const r of rows) {
    if (r.status === "PENDING" || r.status === "SIGNED_UP") stats.active += 1;
    if (r.status === "QUALIFIED") stats.QUALIFIED += 1;
    if (r.status === "SIGNED") stats.SIGNED += 1;
    if (r.status === "EXPIRED") stats.EXPIRED += 1;
    if (r.status === "SIGNED" && r.payoutStatus === "PENDING") {
      stats.pendingPayout += 1;
      stats.pendingPayoutCLP += r.rewardCLP;
    }
    if (r.payoutStatus === "PAID") {
      stats.PAID += 1;
      stats.paidPayoutCLP += r.rewardCLP;
    }
  }
  return stats;
}

// -----------------------------------------------------------------------------
// Tabla BrokerLeads
// -----------------------------------------------------------------------------

type BrokerLeadWithBroker = {
  id: string;
  code: string;
  brokerUserId: string;
  prospectEmail: string;
  prospectUserId: string | null;
  status: string;
  signedUpAt: Date | null;
  contractSignedAt: Date | null;
  expiresAt: Date;
  payoutStatus: string;
  paidAt: Date | null;
  payoutNote: string | null;
  createdAt: Date;
  broker: { email: string; name: string | null };
};

function BrokerLeadsTable({
  brokerLeads,
}: {
  brokerLeads: BrokerLeadWithBroker[];
}) {
  const stats = computeBrokerLeadStats(brokerLeads);

  return (
    <div className="space-y-4">
      <StatsRow
        items={[
          { label: "Activos", value: stats.active },
          { label: "Calificados", value: stats.QUALIFIED },
          { label: "Escrituraron", value: stats.CONTRACT_SIGNED },
          { label: "Pago pendiente", value: stats.pendingPayout, tone: "warn" },
          { label: "Pagados", value: stats.PAID, tone: "ok" },
          { label: "Perdidos", value: stats.LOST, tone: "muted" },
        ]}
      />

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
        💡 La comisión del broker es <strong>variable</strong> (acordada
        offline caso a caso). En la nota de pago, registrar siempre monto
        bruto, descuentos/retenciones, número de boleta o factura, y
        referencia de la transferencia.
      </div>

      {brokerLeads.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
          Todavía no hay broker leads registrados.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <Th>Broker</Th>
                <Th>Code</Th>
                <Th>Prospect</Th>
                <Th>Status</Th>
                <Th>Payout</Th>
                <Th>Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {brokerLeads.map((b) => (
                <BrokerLeadRow key={b.id} brokerLead={b} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BrokerLeadRow({
  brokerLead,
}: {
  brokerLead: BrokerLeadWithBroker;
}) {
  return (
    <tr className="text-sm text-gray-700">
      <Td>
        <div className="font-medium text-gray-900">
          {brokerLead.broker.name ?? "—"}
        </div>
        <div className="text-xs text-gray-500">{brokerLead.broker.email}</div>
      </Td>
      <Td>
        <code className="font-mono text-xs">{brokerLead.code}</code>
      </Td>
      <Td>
        <div className="text-gray-900">{brokerLead.prospectEmail}</div>
        {brokerLead.prospectUserId ? (
          <div className="text-xs text-green-700">cuenta creada</div>
        ) : (
          <div className="text-xs text-gray-500">solo lead</div>
        )}
      </Td>
      <Td>
        <BrokerLeadStatusBadge
          status={brokerLead.status}
          signedUpAt={brokerLead.signedUpAt}
          contractSignedAt={brokerLead.contractSignedAt}
          expiresAt={brokerLead.expiresAt}
          createdAt={brokerLead.createdAt}
        />
      </Td>
      <Td>
        <PayoutBadge
          payoutStatus={brokerLead.payoutStatus}
          paidAt={brokerLead.paidAt}
          payoutNote={brokerLead.payoutNote}
        />
      </Td>
      <Td>
        {brokerLead.status === "CONTRACT_SIGNED" &&
        brokerLead.payoutStatus === "PENDING" ? (
          <MarkPaidForm
            endpoint={`/api/staff/broker-leads/${brokerLead.id}/mark-paid`}
            placeholder="Ej: Boleta hon. 2026-0123 - $850.000 - BCI 18-jun-2026"
          />
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </Td>
    </tr>
  );
}

function computeBrokerLeadStats(rows: BrokerLeadWithBroker[]) {
  const stats = {
    active: 0, // NEW + SIGNED_UP
    QUALIFIED: 0,
    CONTRACT_SIGNED: 0,
    LOST: 0,
    pendingPayout: 0,
    PAID: 0,
  };
  for (const r of rows) {
    if (r.status === "NEW" || r.status === "SIGNED_UP") stats.active += 1;
    if (r.status === "QUALIFIED") stats.QUALIFIED += 1;
    if (r.status === "CONTRACT_SIGNED") stats.CONTRACT_SIGNED += 1;
    if (r.status === "LOST") stats.LOST += 1;
    if (r.status === "CONTRACT_SIGNED" && r.payoutStatus === "PENDING") {
      stats.pendingPayout += 1;
    }
    if (r.payoutStatus === "PAID") stats.PAID += 1;
  }
  return stats;
}

// -----------------------------------------------------------------------------
// Componentes auxiliares
// -----------------------------------------------------------------------------

function StatsRow({
  items,
}: {
  items: {
    label: string;
    value: number | string;
    tone?: "default" | "warn" | "ok" | "muted";
  }[];
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {items.map((it) => {
        const valueClass =
          it.tone === "warn"
            ? "text-orange"
            : it.tone === "ok"
              ? "text-green-700"
              : it.tone === "muted"
                ? "text-gray-500"
                : "text-gray-900";
        return (
          <div
            key={it.label}
            className="flex flex-col rounded-lg border border-gray-200 bg-white px-4 py-2"
          >
            <span className="text-xs uppercase tracking-wider text-gray-500">
              {it.label}
            </span>
            <span className={`font-serif text-lg ${valueClass}`}>
              {it.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left font-medium">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-3 align-top">{children}</td>;
}

function ReferralStatusBadge({
  status,
  signedUpAt,
  signedAt,
  expiresAt,
  createdAt,
}: {
  status: string;
  signedUpAt: Date | null;
  signedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}) {
  const tone =
    status === "SIGNED"
      ? "bg-green-100 text-green-700"
      : status === "EXPIRED"
        ? "bg-gray-100 text-gray-500"
        : status === "QUALIFIED"
          ? "bg-blue-100 text-blue-700"
          : "bg-gray-100 text-gray-700";
  const detail =
    status === "SIGNED"
      ? `escrituró ${formatDate(signedAt)}`
      : status === "EXPIRED"
        ? `venció ${formatDate(expiresAt)}`
        : status === "PENDING"
          ? `lead ${formatDate(createdAt)}`
          : `signup ${formatDate(signedUpAt ?? createdAt)} · vence ${formatDate(expiresAt)}`;
  return (
    <div>
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
        {status}
      </span>
      <div className="mt-0.5 text-xs text-gray-500">{detail}</div>
    </div>
  );
}

function BrokerLeadStatusBadge({
  status,
  signedUpAt,
  contractSignedAt,
  expiresAt,
  createdAt,
}: {
  status: string;
  signedUpAt: Date | null;
  contractSignedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}) {
  const tone =
    status === "CONTRACT_SIGNED"
      ? "bg-green-100 text-green-700"
      : status === "LOST"
        ? "bg-gray-100 text-gray-500"
        : status === "QUALIFIED"
          ? "bg-blue-100 text-blue-700"
          : "bg-gray-100 text-gray-700";
  const detail =
    status === "CONTRACT_SIGNED"
      ? `escrituró ${formatDate(contractSignedAt)}`
      : status === "LOST"
        ? `venció ${formatDate(expiresAt)}`
        : status === "NEW"
          ? `lead ${formatDate(createdAt)}`
          : `signup ${formatDate(signedUpAt ?? createdAt)} · vence ${formatDate(expiresAt)}`;
  return (
    <div>
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
        {status}
      </span>
      <div className="mt-0.5 text-xs text-gray-500">{detail}</div>
    </div>
  );
}

function PayoutBadge({
  payoutStatus,
  paidAt,
  payoutNote,
}: {
  payoutStatus: string;
  paidAt: Date | null;
  payoutNote: string | null;
}) {
  if (payoutStatus === "PAID") {
    return (
      <div>
        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
          Pagado
        </span>
        <div className="mt-0.5 text-xs text-gray-500">
          {formatDate(paidAt)}
        </div>
        {payoutNote && (
          <div
            title={payoutNote}
            className="mt-1 max-w-xs truncate text-xs text-gray-500"
          >
            {payoutNote}
          </div>
        )}
      </div>
    );
  }
  return (
    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
      Pendiente
    </span>
  );
}
