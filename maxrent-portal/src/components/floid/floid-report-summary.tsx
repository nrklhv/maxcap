/**
 * Tarjeta resumen del reporte Floid (SP renta + SII carpeta + CMF deuda).
 * Diseñada para mostrarse al inversionista y al staff por igual.
 *
 * Reusable: solo recibe el `rawResponse` JSON del callback. Si el shape no
 * matchea con el del widget, muestra un fallback amable.
 *
 * @domain creditEvaluation
 */

"use client";

import { Briefcase, Building2, CreditCard, FileText, MapPin, Wallet } from "lucide-react";
import {
  parseFloidWidgetPayload,
  type FloidWidgetReport,
} from "@/lib/floid/parse-floid-response";

function fmtCLP(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `$${Math.round(n).toLocaleString("es-CL")}`;
}

function fmtPeriodYYYYMM(period: string | null): string {
  if (!period || period.length < 6) return period ?? "—";
  const year = period.slice(0, 4);
  const month = period.slice(4, 6);
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  const idx = parseInt(month, 10) - 1;
  return idx >= 0 && idx < 12 ? `${months[idx]} ${year}` : period;
}

interface Props {
  rawResponse: unknown;
  /** Si lo pasás, se usa como fallback de summary cuando el parser no encuentra. */
  fallbackSummary?: string | null;
}

/**
 * Renderiza tarjetas con renta, tributario y deuda. Recibe el JSON crudo
 * tal como vino del callback (`rawResponse`).
 */
export function FloidReportSummary({ rawResponse, fallbackSummary }: Props) {
  const report = parseFloidWidgetPayload(rawResponse);

  if (!report) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        {fallbackSummary ||
          "El reporte aún no contiene secciones interpretables. Revisa el detalle completo o contacta al equipo."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-700 leading-relaxed">{report.summary}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SectionRenta sp={report.sp} />
        <SectionTributario sii={report.sii} />
        <SectionDeuda cmf={report.cmf} />
      </div>
    </div>
  );
}

function SectionRenta({ sp }: { sp: FloidWidgetReport["sp"] }) {
  if (!sp) return <DisabledSection icon="renta" label="Renta" reason="No incluida en el reporte." />;
  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-2">
      <div className="flex items-center gap-2 text-emerald-900">
        <Wallet className="h-4 w-4 shrink-0" />
        <h4 className="text-xs font-semibold uppercase tracking-wide">Renta</h4>
      </div>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">{fmtCLP(sp.remuneracion)}</p>
      <p className="text-xs text-gray-600">por mes (renta imponible)</p>
      <dl className="text-xs text-gray-600 space-y-1 pt-2 border-t border-emerald-100">
        <div className="flex justify-between">
          <dt>Período:</dt>
          <dd className="font-medium text-gray-800">{fmtPeriodYYYYMM(sp.period)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Meses cotizados:</dt>
          <dd className="font-medium text-gray-800">{sp.mesesCotizados ?? "—"}</dd>
        </div>
      </dl>
    </div>
  );
}

function SectionTributario({ sii }: { sii: FloidWidgetReport["sii"] }) {
  if (!sii)
    return <DisabledSection icon="trib" label="Tributario" reason="No incluido en el reporte." />;
  // Renta anual: priorizamos renta líquida imponible (170); si no, base imponible (1098).
  const rentaAnual =
    sii.latestF22?.rentaLiquidaImponible ?? sii.latestF22?.baseImponible ?? null;
  const rentaAnualLabel = sii.latestF22?.rentaLiquidaImponible
    ? "Renta líquida imponible"
    : "Base imponible";
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-2">
      <div className="flex items-center gap-2 text-blue-900">
        <Briefcase className="h-4 w-4 shrink-0" />
        <h4 className="text-xs font-semibold uppercase tracking-wide">Tributario (SII)</h4>
      </div>
      <p className="text-sm font-semibold text-gray-900 line-clamp-2">
        {sii.nombreEmisor ?? "—"}
      </p>
      <p className="text-xs text-gray-600 line-clamp-2">
        {sii.actividadEconomica ?? "Actividad no informada"}
      </p>
      {rentaAnual !== null && (
        <div className="rounded-lg bg-white border border-blue-200 px-2.5 py-1.5">
          <p className="text-[10px] uppercase tracking-wide text-blue-700 font-semibold">
            Renta declarada F22 {sii.latestF22?.year}
          </p>
          <p className="text-base font-bold text-gray-900 tabular-nums">{fmtCLP(rentaAnual)}</p>
          <p className="text-[10px] text-gray-500">{rentaAnualLabel}</p>
        </div>
      )}
      <dl className="text-xs text-gray-600 space-y-1 pt-2 border-t border-blue-100">
        <div className="flex justify-between gap-2">
          <dt>Categoría:</dt>
          <dd className="font-medium text-gray-800 text-right">
            {sii.categoriaTributaria ?? "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Bienes raíces:</dt>
          <dd className="font-medium text-gray-800 text-right">
            {sii.cantidadBienesRaices > 0
              ? `${sii.cantidadBienesRaices} · ${fmtCLP(sii.totalAvaluoFiscal)}`
              : "Ninguno"}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Observaciones:</dt>
          <dd className="font-medium text-gray-800 text-right line-clamp-1">
            {sii.observacionesTributarias ?? "—"}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function SectionDeuda({ cmf }: { cmf: FloidWidgetReport["cmf"] }) {
  if (!cmf)
    return <DisabledSection icon="deuda" label="Deuda" reason="No incluida en el reporte." />;
  const moroso = cmf.totalDebt30To89 + cmf.totalDebt90Plus;
  const lineasTotal = cmf.totalLinesDirect + cmf.totalLinesIndirect;
  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4 space-y-2">
      <div className="flex items-center gap-2 text-violet-900">
        <CreditCard className="h-4 w-4 shrink-0" />
        <h4 className="text-xs font-semibold uppercase tracking-wide">Deuda (CMF)</h4>
      </div>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">{fmtCLP(cmf.totalDebt)}</p>
      <p className="text-xs text-gray-600">
        Directa {fmtCLP(cmf.totalDirectDebt)} · Indirecta {fmtCLP(cmf.totalIndirectDebt)}
      </p>
      <dl className="text-xs text-gray-600 space-y-1 pt-2 border-t border-violet-100">
        <div className="flex justify-between gap-2">
          <dt>Mora &gt;30 días:</dt>
          <dd
            className={`font-medium tabular-nums text-right ${moroso > 0 ? "text-red-700" : "text-gray-800"}`}
          >
            {fmtCLP(moroso)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Líneas disponibles:</dt>
          <dd className="font-medium tabular-nums text-right text-gray-800">
            {fmtCLP(lineasTotal)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Instituciones:</dt>
          <dd className="font-medium text-gray-800 text-right">
            {cmf.institutions.length}
          </dd>
        </div>
        {cmf.updated && (
          <div className="flex justify-between gap-2">
            <dt>Actualizado:</dt>
            <dd className="font-medium text-gray-800 text-right">{cmf.updated}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function DisabledSection({
  icon,
  label,
  reason,
}: {
  icon: "renta" | "trib" | "deuda";
  label: string;
  reason: string;
}) {
  const Icon = icon === "renta" ? Wallet : icon === "trib" ? Briefcase : CreditCard;
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-2 opacity-70">
      <div className="flex items-center gap-2 text-gray-500">
        <Icon className="h-4 w-4 shrink-0" />
        <h4 className="text-xs font-semibold uppercase tracking-wide">{label}</h4>
      </div>
      <p className="text-xs text-gray-500">{reason}</p>
    </div>
  );
}

// Re-exports usadas por el detalle modal — evita duplicar formatters.
export { fmtCLP, fmtPeriodYYYYMM };
export { Building2, FileText, MapPin };
