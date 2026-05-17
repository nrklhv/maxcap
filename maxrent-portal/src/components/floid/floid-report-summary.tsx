/**
 * Tarjeta resumen del reporte Floid — versión minimalista para el inversionista.
 *
 * Muestra **solo la renta estimada por cada método** (SP y SII), sin meta-data
 * extra (meses cotizados, actividad económica, bienes raíces, etc.) ni la
 * sección de deuda (CMF). Todo lo demás vive en el modal de "Ver detalle
 * completo" (`floid-report-detail.tsx`).
 *
 * Decisión de UX (2026-05-17): el inversionista necesita saber su capacidad
 * de compra rápido. SP y SII son dos lecturas independientes de la misma cosa
 * (renta mensual); el resto es ruido para la mayoría.
 *
 * @domain creditEvaluation
 */

"use client";

import { Briefcase, Building2, FileText, MapPin, Wallet } from "lucide-react";
import {
  parseFloidWidgetPayload,
  type FloidWidgetReport,
} from "@/lib/floid/parse-floid-response";
import { humanizeFloidError, sectionLabel } from "@/lib/floid/error-messages";

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

  // Solo mostramos cards de renta (SP + SII). CMF (deuda) vive en el modal de
  // detalle. Si una sección está null o el método no devolvió datos de renta,
  // se omite (sin placeholder "no disponible").
  const sections: React.ReactNode[] = [];
  if (report.sp) sections.push(<SectionRentaSP key="sp" sp={report.sp} />);
  if (report.sii && hasSiiRenta(report.sii))
    sections.push(<SectionRentaSII key="sii" sii={report.sii} />);

  // Solo banner para errores de SP/SII (los métodos de renta). El error de CMF
  // no es relevante en el resumen — el detalle modal lo muestra si hace falta.
  const errorBanners = (["sp", "sii"] as const)
    .map((key) => {
      const err = report.errors[key];
      if (!err) return null;
      const humanized = humanizeFloidError(err);
      return { key, label: sectionLabel(key), humanized };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <div className="space-y-4">
      {errorBanners.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide">
            Reporte parcial — algunas secciones no se pudieron obtener
          </p>
          <ul className="space-y-2">
            {errorBanners.map((e) => (
              <li key={e.key} className="text-sm text-amber-900 leading-snug">
                <span className="font-medium">{e.label}:</span> {e.humanized.message}
                {e.humanized.hint && (
                  <span className="block text-xs text-amber-800 mt-0.5">
                    {e.humanized.hint}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {sections.length > 0 && (
        <div
          className={`grid gap-3 ${
            sections.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
          }`}
        >
          {sections}
        </div>
      )}
    </div>
  );
}

/** Verifica si el F22 del SII trae algún dato de renta (anual) para derivar mensual. */
function hasSiiRenta(sii: NonNullable<FloidWidgetReport["sii"]>): boolean {
  return Boolean(
    sii.latestF22?.rentaLiquidaImponible || sii.latestF22?.baseImponible
  );
}

/**
 * Renta estimada según cotización previsional (SuperPensiones).
 * Solo el monto + label. Período + meses cotizados → modal de detalle.
 */
function SectionRentaSP({ sp }: { sp: NonNullable<FloidWidgetReport["sp"]> }) {
  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-5 text-center">
      <div className="inline-flex items-center gap-2 text-emerald-900">
        <Wallet className="h-4 w-4 shrink-0" />
        <h4 className="text-xs font-semibold uppercase tracking-wide">
          Renta estimada
        </h4>
      </div>
      <p className="mt-3 text-3xl font-bold text-gray-900 tabular-nums">
        {fmtCLP(sp.remuneracion)}
      </p>
      <p className="mt-1 text-xs text-gray-600">
        Según cotización previsional · mensual
      </p>
    </div>
  );
}

/**
 * Renta estimada según declaración SII (F22): anual ÷ 12.
 * Solo el monto mensual + label. Categoría, bienes raíces, sociedades, etc.
 * → modal de detalle.
 */
function SectionRentaSII({ sii }: { sii: NonNullable<FloidWidgetReport["sii"]> }) {
  const rentaAnual =
    sii.latestF22?.rentaLiquidaImponible ?? sii.latestF22?.baseImponible ?? null;
  if (rentaAnual === null) return null;
  const rentaMensual = rentaAnual / 12;
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-5 text-center">
      <div className="inline-flex items-center gap-2 text-blue-900">
        <Briefcase className="h-4 w-4 shrink-0" />
        <h4 className="text-xs font-semibold uppercase tracking-wide">
          Renta estimada
        </h4>
      </div>
      <p className="mt-3 text-3xl font-bold text-gray-900 tabular-nums">
        {fmtCLP(rentaMensual)}
      </p>
      <p className="mt-1 text-xs text-gray-600">
        Según declaración SII F22 {sii.latestF22?.year} · mensual
      </p>
    </div>
  );
}

// Re-exports usadas por el detalle modal — evita duplicar formatters.
export { fmtCLP, fmtPeriodYYYYMM };
export { Building2, FileText, MapPin };
