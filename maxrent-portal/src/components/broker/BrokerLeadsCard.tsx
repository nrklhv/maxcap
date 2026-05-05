// =============================================================================
// BrokerLeadsCard — sección "Mis referidos" en /broker/referidos
// =============================================================================
//
// Server component. Misma estructura visual que `portal/ReferralsCard.tsx`
// pero adaptado al broker:
//   • SIN montos visibles (la comisión es VARIABLE, acordada offline).
//   • Stats funnel (NEW → SIGNED_UP → QUALIFIED → CONTRACT_SIGNED + LOST).
//   • Lista de prospects con countdown de 120 días post-signup.
//   • Texto del header NO promete monto fijo — solo refiere a "la comisión
//     acordada".
//
// Reutilizamos `ReferralCopyButton` (es genérico, recibe URL como prop).
//
// Detalle de negocio: docs/DATABASE.md sección "Atribución de referidos" +
// memory/project_referral_attribution.md.
// =============================================================================

import { ReferralCopyButton } from "@/components/portal/ReferralCopyButton";

import type { BrokerLead, BrokerLeadStatus, PayoutStatus } from "@prisma/client";

// -----------------------------------------------------------------------------
// Tipos
// -----------------------------------------------------------------------------

/** Subset de columnas necesarias del modelo `BrokerLead`. */
export type BrokerLeadRow = Pick<
  BrokerLead,
  | "id"
  | "prospectEmail"
  | "status"
  | "signedUpAt"
  | "contractSignedAt"
  | "expiresAt"
  | "payoutStatus"
  | "paidAt"
  | "createdAt"
>;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function daysBetween(now: Date, to: Date): number {
  return Math.floor((to.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// -----------------------------------------------------------------------------
// Componente principal
// -----------------------------------------------------------------------------

type Props = {
  /** Code BRK-XXXXXX del broker actual. */
  code: string;
  /** Lista de prospects atribuidos a este broker. Orden recomendado: createdAt desc. */
  brokerLeads: BrokerLeadRow[];
  /** Base URL del landing (ej. `https://www.maxrent.cl`). */
  landingBaseUrl: string;
};

export function BrokerLeadsCard({ code, brokerLeads, landingBaseUrl }: Props) {
  const referralUrl = `${landingBaseUrl}/?ref=${code}`;
  const stats = computeFunnelStats(brokerLeads);

  return (
    <div className="space-y-6">
      {/* Cómo funciona — sin mencionar monto */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl tracking-tight text-broker-navy">
            Tu link de referidos
          </h2>
          <span className="rounded-full bg-broker-navy/10 px-2.5 py-0.5 text-xs font-semibold text-broker-navy">
            BRK-
          </span>
        </div>

        <div className="mb-5 rounded-lg bg-broker-accent-soft p-4 text-sm leading-relaxed text-broker-muted">
          <p className="mb-2 font-medium text-broker-navy">Cómo funciona</p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              Compartí tu link con prospects. Cada inversionista que entre por
              acá queda atribuido a tu corretaje en el sistema.
            </li>
            <li>
              Si tu prospect escritura una propiedad, MaxRent te paga la
              comisión acordada al momento de la escritura.
            </li>
            <li>
              Tu prospect tiene{" "}
              <strong className="text-broker-navy">120 días</strong> desde que
              crea cuenta para escriturar. Pasado ese plazo, ya no genera
              comisión y el lead pasa a estado <em>Perdido</em>.
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-broker-muted">
            Tu link
          </p>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
            <code className="flex-1 break-all font-mono text-sm text-broker-navy">
              {referralUrl}
            </code>
            <ReferralCopyButton
              url={referralUrl}
              className="inline-flex items-center gap-1.5 rounded-md bg-broker-navy px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-broker-navy/90"
            />
          </div>
        </div>
      </div>

      {/* Stats funnel */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 font-serif text-lg tracking-tight text-broker-navy">
          Embudo
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <FunnelStat label="Lead capturado" value={stats.NEW} subtle />
          <FunnelStat label="Creó cuenta" value={stats.SIGNED_UP} />
          <FunnelStat label="Calificado" value={stats.QUALIFIED} />
          <FunnelStat
            label="Escrituró"
            value={stats.CONTRACT_SIGNED}
            tone="success"
          />
          <FunnelStat label="Perdido" value={stats.LOST} tone="muted" />
        </div>
        {stats.pendingPayout > 0 && (
          <p className="mt-4 rounded-lg bg-orange/10 p-3 text-sm text-orange">
            Tenés <strong>{stats.pendingPayout}</strong> escrituras con pago
            pendiente. Staff procesa la transferencia y registra el detalle.
          </p>
        )}
      </div>

      {/* Lista detallada */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 font-serif text-lg tracking-tight text-broker-navy">
          Tus prospects
        </h3>
        {brokerLeads.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-broker-muted">
            Todavía no traes prospects vía tu link. Compartilo arriba para
            empezar a poblar el embudo.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {brokerLeads.map((b) => (
              <BrokerLeadRowItem key={b.id} brokerLead={b} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Stat tile
// -----------------------------------------------------------------------------

function FunnelStat({
  label,
  value,
  tone = "default",
  subtle = false,
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "muted";
  subtle?: boolean;
}) {
  const valueClass =
    tone === "success"
      ? "text-green-700"
      : tone === "muted"
        ? "text-gray-500"
        : "text-broker-navy";
  return (
    <div
      className={`rounded-lg border p-3 ${
        subtle
          ? "border-gray-200 bg-broker-canvas"
          : "border-gray-200 bg-white"
      }`}
    >
      <p className="text-xs uppercase tracking-wider text-broker-muted">
        {label}
      </p>
      <p className={`font-serif text-2xl ${valueClass}`}>{value}</p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Fila individual
// -----------------------------------------------------------------------------

function BrokerLeadRowItem({ brokerLead }: { brokerLead: BrokerLeadRow }) {
  const now = new Date();
  const meta = describeBrokerLeadStatus(brokerLead, now);

  return (
    <li className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-broker-navy">
          {brokerLead.prospectEmail}
        </p>
        <p className={`mt-0.5 text-xs ${meta.tone}`}>{meta.line}</p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.badgeClass}`}
      >
        {meta.badge}
      </span>
    </li>
  );
}

type StatusMeta = {
  badge: string;
  badgeClass: string;
  line: string;
  tone: string;
};

function describeBrokerLeadStatus(
  b: BrokerLeadRow,
  now: Date
): StatusMeta {
  if (b.status === "CONTRACT_SIGNED") {
    if (b.payoutStatus === "PAID") {
      return {
        badge: "Comisión pagada",
        badgeClass: "bg-green-100 text-green-700",
        line: `Escrituró el ${b.contractSignedAt ? formatDate(b.contractSignedAt) : "—"} · pago registrado${
          b.paidAt ? ` el ${formatDate(b.paidAt)}` : ""
        }`,
        tone: "text-broker-muted",
      };
    }
    return {
      badge: "Pago pendiente",
      badgeClass: "bg-orange/10 text-orange",
      line: `Escrituró el ${b.contractSignedAt ? formatDate(b.contractSignedAt) : "—"} · staff procesa la transferencia`,
      tone: "text-broker-muted",
    };
  }

  if (b.status === "LOST") {
    return {
      badge: "Perdido",
      badgeClass: "bg-gray-100 text-gray-500",
      line: `Venció sin escriturar · ${formatDate(b.expiresAt)}`,
      tone: "text-gray-500",
    };
  }

  // Activos: NEW / SIGNED_UP / QUALIFIED
  const days = daysBetween(now, b.expiresAt);
  const isWarn = days <= 30;
  const phaseLine =
    b.status === "NEW"
      ? `Capturado el ${formatDate(b.createdAt)} · falta crear cuenta`
      : b.status === "SIGNED_UP"
        ? `Creó cuenta el ${b.signedUpAt ? formatDate(b.signedUpAt) : formatDate(b.createdAt)}`
        : `Calificado · evaluación crediticia OK`;

  const lineSuffix =
    days < 0
      ? `vence hoy o ya venció`
      : `vence en ${days} día${days === 1 ? "" : "s"} (${formatDate(b.expiresAt)})`;

  return {
    badge:
      b.status === "NEW"
        ? "Sin cuenta"
        : b.status === "QUALIFIED"
          ? "Calificado"
          : "Activo",
    badgeClass:
      b.status === "NEW"
        ? "bg-gray-100 text-gray-600"
        : "bg-broker-navy/10 text-broker-navy",
    line: `${phaseLine} · ${isWarn ? "⚠️ " : ""}${lineSuffix}`,
    tone: isWarn ? "text-orange" : "text-broker-muted",
  };
}

// -----------------------------------------------------------------------------
// Stats agregados
// -----------------------------------------------------------------------------

function computeFunnelStats(rows: BrokerLeadRow[]) {
  const stats = {
    NEW: 0,
    SIGNED_UP: 0,
    QUALIFIED: 0,
    CONTRACT_SIGNED: 0,
    LOST: 0,
    pendingPayout: 0,
  };
  for (const r of rows) {
    stats[r.status] += 1;
    if (r.status === "CONTRACT_SIGNED" && r.payoutStatus === "PENDING") {
      stats.pendingPayout += 1;
    }
  }
  return stats;
}

// Re-export para que la page no necesite importar de @prisma/client
export type { BrokerLeadStatus, PayoutStatus };
