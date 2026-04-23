/**
 * Pure helpers for broker catalog: UF conversion, cap rate, payment score, 12-month dots.
 * Logic matches `ficha_propiedades_broker_v3.html` prototype.
 *
 * @domain broker
 * @pure All exports are deterministic given arguments (pass `referenceDate` for dots).
 */

import type {
  BrokerCatalogPaymentsByPropertyId,
  BrokerCatalogProperty,
  CapRateBand,
  PaymentDotCell,
  PaymentDotKind,
} from "./catalog-types";

/** UF→CLP rate used in the demo (same as HTML prototype). */
export const CATALOG_UF_CLP = 38615;

const MONTHS_ES: Record<string, string> = {
  "01": "Ene",
  "02": "Feb",
  "03": "Mar",
  "04": "Abr",
  "05": "May",
  "06": "Jun",
  "07": "Jul",
  "08": "Ago",
  "09": "Sep",
  "10": "Oct",
  "11": "Nov",
  "12": "Dic",
};

export function formatClp(n: number): string {
  return `$ ${Math.round(n).toLocaleString("es-CL")}`;
}

export function formatPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

export function arriendoClp(p: BrokerCatalogProperty, ufRate: number = CATALOG_UF_CLP): number {
  return p.moneda === "uf" ? p.arriendo * ufRate : p.arriendo;
}

export function ventaUf(p: BrokerCatalogProperty, ufRate: number = CATALOG_UF_CLP): number {
  return p.monedaVenta === "UF" ? p.venta : p.venta / ufRate;
}

export function ventaClp(p: BrokerCatalogProperty, ufRate: number = CATALOG_UF_CLP): number {
  return p.monedaVenta === "UF" ? p.venta * ufRate : p.venta;
}

export function capRate(
  p: BrokerCatalogProperty,
  ufRate: number = CATALOG_UF_CLP
): number | null {
  const a = arriendoClp(p, ufRate) * 12;
  const v = ventaClp(p, ufRate);
  if (v <= 0) return null;
  return (a / v) * 100;
}

/** Cap rate from monthly rent (CLP) and sale value (CLP), same formula as catalog. */
export function capRateFromMonthlyClpAndSaleClp(
  arriendoMonthlyClp: number,
  saleValueClp: number
): number | null {
  if (!Number.isFinite(arriendoMonthlyClp) || !Number.isFinite(saleValueClp)) return null;
  const annual = arriendoMonthlyClp * 12;
  if (saleValueClp <= 0) return null;
  return (annual / saleValueClp) * 100;
}

export function capRateBand(cr: number | null): CapRateBand {
  if (cr == null) return "low";
  if (cr >= 6) return "good";
  if (cr >= 4) return "mid";
  return "low";
}

export function capRateEmoji(cr: number): string {
  if (cr >= 6) return "✅";
  if (cr >= 4) return "⚠️";
  return "🔻";
}

export interface PayAnalysis {
  vencidos: { dias: number; status?: string }[];
  pagados: { dias: number; status?: string }[];
  score: number | null;
  stars: string;
}

export function payAnalysis(
  propertyId: number,
  paymentsById: BrokerCatalogPaymentsByPropertyId
): PayAnalysis {
  const raw = paymentsById[propertyId] ?? [];
  const vencidos = raw.filter((x) => x.dias >= 0);
  const pagados = vencidos.filter((x) => x.status === "PAID");
  const score =
    vencidos.length > 0 ? Math.round((pagados.length / vencidos.length) * 100) : null;
  const stars =
    score === null
      ? "—"
      : score === 100
        ? "★★★★★"
        : score >= 90
          ? "★★★★☆"
          : score >= 75
            ? "★★★☆☆"
            : score >= 50
              ? "★★☆☆☆"
              : "★☆☆☆☆";
  return { vencidos, pagados, score, stars };
}

function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(d: Date): string {
  const mon = String(d.getMonth() + 1).padStart(2, "0");
  const name = MONTHS_ES[mon] ?? mon;
  return `${name} ${String(d.getFullYear()).slice(2)}`;
}

function sortedPaymentsDesc(
  propertyId: number,
  paymentsById: BrokerCatalogPaymentsByPropertyId
): { month: string; dias: number; status?: "PAID" }[] {
  return [...(paymentsById[propertyId] ?? [])].sort((a, b) => b.month.localeCompare(a.month));
}

/** Card grid: 12 dots with symbols (matches HTML `payDots`). */
export function paymentDotsCard(
  propertyId: number,
  paymentsById: BrokerCatalogPaymentsByPropertyId,
  referenceDate: Date = new Date()
): PaymentDotCell[] {
  const raw = sortedPaymentsDesc(propertyId, paymentsById);
  const dots: PaymentDotCell[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
    const key = monthKey(d);
    const label = monthLabel(d);
    const entry = raw.find((r) => r.month === key);
    if (!entry) {
      dots.push({
        kind: "nodata",
        title: `${label} · Sin datos`,
        symbol: "?",
      });
    } else if (entry.dias < 0) {
      dots.push({ kind: "future", title: `${label} · No vencido`, symbol: "·" });
    } else if (entry.status === "PAID" && entry.dias <= 0) {
      dots.push({ kind: "paid", title: `${label} · Al día`, symbol: "✓" });
    } else if (entry.status === "PAID" && entry.dias <= 5) {
      dots.push({
        kind: "late-leve",
        title: `${label} · ${entry.dias}d atraso`,
        symbol: "✓",
      });
    } else if (entry.status === "PAID" && entry.dias <= 15) {
      dots.push({
        kind: "late-mod",
        title: `${label} · ${entry.dias}d atraso`,
        symbol: "!",
      });
    } else if (entry.status === "PAID") {
      dots.push({
        kind: "late-grave",
        title: `${label} · ${entry.dias}d atraso`,
        symbol: "!!",
      });
    } else {
      dots.push({ kind: "late-grave", title: `${label} · Impago`, symbol: "✗" });
    }
  }
  return dots;
}

/** List row: 12 small squares (matches HTML `listDots` classification). */
export function paymentDotsList(
  propertyId: number,
  paymentsById: BrokerCatalogPaymentsByPropertyId,
  referenceDate: Date = new Date()
): { kind: PaymentDotKind; title: string }[] {
  const raw = sortedPaymentsDesc(propertyId, paymentsById);
  const dots: { kind: PaymentDotKind; title: string }[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
    const key = monthKey(d);
    const label = monthLabel(d);
    const entry = raw.find((r) => r.month === key);
    let kind: PaymentDotKind = "nodata";
    let title = `${label} · Sin datos`;
    if (entry) {
      if (entry.dias < 0) {
        kind = "future";
        title = `${label} · No vencido`;
      } else if (entry.status === "PAID" && entry.dias <= 5) {
        kind = "paid";
        title = `${label} · Al día`;
      } else if (entry.status === "PAID" && entry.dias <= 15) {
        kind = "late-mod";
        title = `${label} · ${entry.dias}d atraso`;
      } else if (entry.status === "PAID") {
        kind = "late-grave";
        title = `${label} · ${entry.dias}d atraso`;
      } else {
        kind = "late-grave";
        title = `${label} · Impago`;
      }
    }
    dots.push({ kind, title });
  }
  return dots;
}

export function formatArriendoDisplay(p: BrokerCatalogProperty): string {
  return p.moneda === "uf"
    ? `${p.arriendo} UF/mes`
    : `${formatClp(p.arriendo)}/mes`;
}

export function formatArriendoListCell(p: BrokerCatalogProperty): string {
  return p.moneda === "uf" ? `${p.arriendo} UF` : formatClp(p.arriendo);
}

export function formatVentaDisplay(p: BrokerCatalogProperty): string {
  return p.monedaVenta === "UF"
    ? `${p.venta.toLocaleString("es-CL")} UF`
    : formatClp(p.venta);
}

export function capRateNote(cr: number | null): string {
  if (cr == null) return "";
  if (cr >= 6) return "Alta rentabilidad";
  if (cr >= 4) return "Rentabilidad media";
  return "Baja rentabilidad";
}
