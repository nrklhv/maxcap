// =============================================================================
// ReferralsCard — sección "Tus referidos" en /dashboard
// =============================================================================
//
// Server component que renderiza:
//   • Header con cómo funciona el programa ($500.000 cash al banco al
//     escriturar, ventana de 120 días).
//   • Link copiable con el `INV-XXXXXX` del usuario.
//   • Lista de referrals con su status, días para vencer, y pago si aplica.
//   • Empty state si no tiene referidos todavía.
//
// El componente NO toca DB — recibe `referrals` y `code` como props desde
// `dashboard/page.tsx` que arma todo en server. El único componente cliente
// es `ReferralCopyButton`.
//
// Detalle del programa (negocio): docs/DATABASE.md sección "Atribución de
// referidos" + memory/project_referral_attribution.md.
// =============================================================================

import { ReferralCopyButton } from "./ReferralCopyButton";

import type { Referral, ReferralStatus, PayoutStatus } from "@prisma/client";

// -----------------------------------------------------------------------------
// Tipos y helpers
// -----------------------------------------------------------------------------

/** Subset de columnas necesarias del modelo `Referral`. */
export type ReferralRow = Pick<
  Referral,
  | "id"
  | "referredEmail"
  | "status"
  | "signedUpAt"
  | "signedAt"
  | "expiresAt"
  | "rewardCLP"
  | "payoutStatus"
  | "paidAt"
  | "createdAt"
>;

/** Diferencia en días entre `to` y `now`, redondeado hacia abajo. */
function daysBetween(now: Date, to: Date): number {
  const ms = to.getTime() - now.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function formatCLP(amount: number): string {
  return amount.toLocaleString("es-CL");
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
  /** Code de referido del usuario actual (formato `INV-XXXXXX`). */
  code: string;
  /** Lista de referrals donde este usuario es el referidor. Orden recomendado: createdAt desc. */
  referrals: ReferralRow[];
  /** Base URL del landing (ej. `https://www.maxrent.cl`). El link se arma `<base>/?ref=<code>`. */
  landingBaseUrl: string;
};

export function ReferralsCard({ code, referrals, landingBaseUrl }: Props) {
  const referralUrl = `${landingBaseUrl}/?ref=${code}`;
  const totalPaid = referrals
    .filter((r) => r.payoutStatus === "PAID")
    .reduce((acc, r) => acc + r.rewardCLP, 0);
  const totalPending = referrals
    .filter((r) => r.status === "SIGNED" && r.payoutStatus === "PENDING")
    .reduce((acc, r) => acc + r.rewardCLP, 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-xl tracking-tight text-dark">
          Tus referidos
        </h2>
        <span className="rounded-full bg-orange/10 px-2.5 py-0.5 text-xs font-semibold text-orange">
          $500.000 por amigo
        </span>
      </div>

      {/* Cómo funciona */}
      <div className="mb-5 rounded-lg bg-cream/50 p-4 text-sm leading-relaxed text-gray-700">
        <p className="mb-2 font-medium text-dark">Cómo funciona</p>
        <ul className="list-inside list-disc space-y-1 text-gray-600">
          <li>
            Compartí tu link. Por cada amigo que se inscriba al Club y
            escriture una propiedad, recibís{" "}
            <strong className="text-dark">$500.000</strong> en tu cuenta
            bancaria.
          </li>
          <li>
            Tu amigo tiene <strong className="text-dark">120 días</strong>{" "}
            desde que se inscribe para escriturar. Pasado ese plazo, ya no
            aplica el beneficio.
          </li>
          <li>
            El pago se hace al momento de la escritura. Sin tope de referidos.
          </li>
        </ul>
      </div>

      {/* Link copiable */}
      <div className="mb-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
          Tu link
        </p>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
          <code className="flex-1 break-all font-mono text-sm text-dark">
            {referralUrl}
          </code>
          <ReferralCopyButton url={referralUrl} />
        </div>
      </div>

      {/* Totales */}
      {(totalPaid > 0 || totalPending > 0) && (
        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Recibido
            </p>
            <p className="font-serif text-lg text-dark">
              ${formatCLP(totalPaid)} CLP
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Pendiente de pago
            </p>
            <p className="font-serif text-lg text-orange">
              ${formatCLP(totalPending)} CLP
            </p>
          </div>
        </div>
      )}

      {/* Lista de referidos */}
      {referrals.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          Todavía no referiste a nadie. Compartí tu link arriba para empezar.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {referrals.map((r) => (
            <ReferralRowItem key={r.id} referral={r} />
          ))}
        </ul>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Fila individual
// -----------------------------------------------------------------------------

function ReferralRowItem({ referral }: { referral: ReferralRow }) {
  const now = new Date();
  const meta = describeReferralStatus(referral, now);

  return (
    <li className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-dark">
          {referral.referredEmail}
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

// -----------------------------------------------------------------------------
// Estado humano de cada referral
// -----------------------------------------------------------------------------

type StatusMeta = {
  badge: string;
  badgeClass: string;
  line: string;
  /** Tailwind class para el color del subtexto. */
  tone: string;
};

function describeReferralStatus(r: ReferralRow, now: Date): StatusMeta {
  // SIGNED — escrituró, mostrar pago
  if (r.status === "SIGNED") {
    if (r.payoutStatus === "PAID") {
      return {
        badge: "Pagado",
        badgeClass: "bg-green-100 text-green-700",
        line: `Escrituró el ${r.signedAt ? formatDate(r.signedAt) : "—"} · $${formatCLP(r.rewardCLP)} transferidos${
          r.paidAt ? ` el ${formatDate(r.paidAt)}` : ""
        }`,
        tone: "text-gray-600",
      };
    }
    return {
      badge: "Pago en curso",
      badgeClass: "bg-orange/10 text-orange",
      line: `Escrituró el ${r.signedAt ? formatDate(r.signedAt) : "—"} · $${formatCLP(r.rewardCLP)} a tu favor (procesando transferencia)`,
      tone: "text-gray-600",
    };
  }

  // EXPIRED — venció sin escriturar
  if (r.status === "EXPIRED") {
    return {
      badge: "Vencido",
      badgeClass: "bg-gray-100 text-gray-500",
      line: `No escrituró antes del plazo · venció el ${formatDate(r.expiresAt)}`,
      tone: "text-gray-500",
    };
  }

  // Activos: PENDING / SIGNED_UP / QUALIFIED
  const days = daysBetween(now, r.expiresAt);
  const isWarn = days <= 30;
  const phaseLine =
    r.status === "PENDING"
      ? `Inscripto el ${formatDate(r.createdAt)} · falta crear cuenta`
      : r.status === "SIGNED_UP"
        ? `Creó cuenta el ${r.signedUpAt ? formatDate(r.signedUpAt) : formatDate(r.createdAt)}`
        : `Calificado · evaluación crediticia OK`;

  const lineSuffix =
    days < 0
      ? `vence hoy o ya venció`
      : `vence en ${days} día${days === 1 ? "" : "s"} (${formatDate(r.expiresAt)})`;

  return {
    badge: r.status === "PENDING" ? "Sin cuenta" : r.status === "QUALIFIED" ? "Calificado" : "Activo",
    badgeClass:
      r.status === "PENDING"
        ? "bg-gray-100 text-gray-600"
        : r.status === "QUALIFIED"
          ? "bg-blue-50 text-blue-700"
          : "bg-blue-50 text-blue-700",
    line: `${phaseLine} · ${isWarn ? "⚠️ " : ""}${lineSuffix}`,
    tone: isWarn ? "text-orange" : "text-gray-600",
  };
}

// Re-export tipos para que `dashboard/page.tsx` no necesite importar de @prisma/client
export type { ReferralStatus, PayoutStatus };
