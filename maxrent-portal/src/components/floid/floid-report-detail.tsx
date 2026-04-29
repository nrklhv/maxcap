/**
 * Vista expandida del reporte Floid: cada sección con todos sus items.
 * Pensada para abrirse en modal desde el portal staff y como página de detalle
 * en el portal inversionista.
 *
 * @domain creditEvaluation
 */

"use client";

import { useState } from "react";
import { Briefcase, CreditCard, FileText, MapPin, Wallet, Download, ChevronDown, ChevronUp, FileSpreadsheet } from "lucide-react";
import {
  parseFloidWidgetPayload,
  f22CodeLabel,
  type FloidWidgetReport,
  type F22YearData,
} from "@/lib/floid/parse-floid-response";

function fmtCLP(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `$${Math.round(n).toLocaleString("es-CL")}`;
}

interface Props {
  rawResponse: unknown;
  /** Si lo pasás (fallback o porque ya lo tenés persistido) y el parser falla, se muestra. */
  fallbackSummary?: string | null;
  /** Si lo pasás explícito, ignora el del rawResponse (útil para render con la URL ya persistida). */
  downloadPdfUrl?: string | null;
  /** Mostrar JSON crudo colapsable (recomendado solo para staff). */
  showRawJson?: boolean;
}

export function FloidReportDetail({
  rawResponse,
  fallbackSummary,
  downloadPdfUrl,
  showRawJson = false,
}: Props) {
  const report = parseFloidWidgetPayload(rawResponse);
  const [showRaw, setShowRaw] = useState(false);

  const pdfUrl = downloadPdfUrl ?? report?.downloadPdfUrl ?? null;

  return (
    <div className="space-y-6">
      {/* Header con summary + PDF */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <p className="text-sm text-gray-700 leading-relaxed flex-1">
          {report?.summary || fallbackSummary || "Reporte recibido."}
        </p>
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors shrink-0"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Descargar PDF
          </a>
        )}
      </div>

      {report?.sp && <RentaDetail sp={report.sp} />}
      {report?.sii && <TributarioDetail sii={report.sii} />}
      {report?.cmf && <DeudaDetail cmf={report.cmf} />}

      {!report && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          El reporte no contiene secciones reconocibles. Puede ser un payload de error o un shape distinto al esperado.
        </div>
      )}

      {/* JSON crudo (solo staff) */}
      {showRawJson && (
        <div className="rounded-xl border border-gray-200 bg-gray-50/40">
          <button
            type="button"
            onClick={() => setShowRaw(!showRaw)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" aria-hidden />
              JSON crudo (debugging)
            </span>
            {showRaw ? (
              <ChevronUp className="h-4 w-4" aria-hidden />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden />
            )}
          </button>
          {showRaw && (
            <pre className="text-xs font-mono text-gray-700 bg-white border-t border-gray-200 px-4 py-3 overflow-auto max-h-96">
              {JSON.stringify(rawResponse, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function RentaDetail({ sp }: { sp: NonNullable<FloidWidgetReport["sp"]> }) {
  return (
    <section className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-5 space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
        <Wallet className="h-4 w-4" aria-hidden />
        Renta — Superintendencia de Pensiones
      </h3>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <DLItem label="Renta imponible mensual" value={fmtCLP(sp.remuneracion)} highlight />
        <DLItem label="Período" value={sp.period ?? "—"} />
        <DLItem label="Meses cotizados" value={sp.mesesCotizados?.toString() ?? "—"} />
        <DLItem label="Moneda" value={sp.moneda ?? "—"} />
      </dl>
      {sp.fuente && (
        <p className="text-xs text-gray-500">
          Fuente: {sp.fuente}
          {sp.fechaConsulta ? ` · Consultado ${sp.fechaConsulta}` : ""}
        </p>
      )}
    </section>
  );
}

function TributarioDetail({ sii }: { sii: NonNullable<FloidWidgetReport["sii"]> }) {
  return (
    <section className="rounded-xl border border-blue-100 bg-blue-50/40 p-5 space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-900">
        <Briefcase className="h-4 w-4" aria-hidden />
        Información tributaria — SII
      </h3>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <DLItem label="Razón social" value={sii.nombreEmisor ?? "—"} />
        <DLItem label="RUT" value={sii.rutEmisor ?? "—"} />
        <DLItem label="Inicio actividades" value={sii.fechaInicioActividades ?? "—"} />
        <DLItem label="Categoría tributaria" value={sii.categoriaTributaria ?? "—"} />
        <DLItem label="Actividad económica" value={sii.actividadEconomica ?? "—"} colspan />
        <DLItem label="Domicilio" value={sii.domicilio ?? "—"} colspan />
      </dl>

      {sii.observacionesTributarias && (
        <div className="rounded-lg bg-white border border-blue-200 px-3 py-2 text-xs text-gray-700">
          <span className="font-medium">Observaciones:</span> {sii.observacionesTributarias}
        </div>
      )}

      {sii.bienesRaices.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            Bienes raíces ({sii.cantidadBienesRaices}) · Avalúo total {fmtCLP(sii.totalAvaluoFiscal)}
          </h4>
          <div className="space-y-1.5">
            {sii.bienesRaices.map((b, i) => (
              <div
                key={`${b.rol}-${i}`}
                className="rounded-lg bg-white border border-blue-100 px-3 py-2 text-xs grid grid-cols-1 sm:grid-cols-3 gap-1.5"
              >
                <div className="sm:col-span-2">
                  <p className="font-medium text-gray-900">{b.direccion ?? "—"}</p>
                  <p className="text-gray-600">
                    {b.comuna ?? "—"} · Rol {b.rol ?? "—"} · {b.destino ?? "—"}
                  </p>
                </div>
                <div className="text-right tabular-nums">
                  <p className="font-semibold text-gray-900">{fmtCLP(b.avaluoFiscal)}</p>
                  <p className="text-gray-500">{b.condicion ?? ""}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sii.f22Years.length > 0 && <F22Block sii={sii} />}
    </section>
  );
}

function F22Block({ sii }: { sii: NonNullable<FloidWidgetReport["sii"]> }) {
  // Inicializa expandido el año más reciente; el resto colapsado.
  const latestYear = sii.latestF22?.year ?? sii.f22Years[sii.f22Years.length - 1];
  const [expandedYears, setExpandedYears] = useState<Set<string>>(
    new Set(latestYear ? [latestYear] : [])
  );

  function toggleYear(year: string) {
    setExpandedYears((s) => {
      const next = new Set(s);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
        <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden />
        Declaraciones anuales (F22)
      </h4>

      {sii.latestF22 && (
        <div className="rounded-lg bg-white border border-blue-200 p-3">
          <p className="text-[11px] uppercase tracking-wide text-blue-700 font-semibold mb-2">
            Resumen año {sii.latestF22.year}
          </p>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {sii.latestF22.rentaLiquidaImponible !== null && (
              <F22Item
                label="Renta líquida imponible"
                value={fmtCLP(sii.latestF22.rentaLiquidaImponible)}
                code="170"
                highlight
              />
            )}
            {sii.latestF22.baseImponible !== null && (
              <F22Item
                label="Base imponible"
                value={fmtCLP(sii.latestF22.baseImponible)}
                code="1098"
              />
            )}
            {sii.latestF22.totalImpuesto !== null && (
              <F22Item
                label="Impuestos personales"
                value={fmtCLP(sii.latestF22.totalImpuesto)}
                code="158"
              />
            )}
            {sii.latestF22.diferencia !== null && (
              <F22Item
                label="Diferencia"
                value={fmtCLP(sii.latestF22.diferencia)}
                code="304"
              />
            )}
            {sii.latestF22.devolucion !== null && (
              <F22Item
                label="Devolución"
                value={fmtCLP(sii.latestF22.devolucion)}
                code="305"
              />
            )}
          </dl>
        </div>
      )}

      <div className="space-y-2">
        {sii.f22Years
          .slice()
          .reverse()
          .map((year) => {
            const data = sii.f22ByYear[year];
            const isOpen = expandedYears.has(year);
            return (
              <div
                key={year}
                className="rounded-lg border border-blue-100 bg-white overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleYear(year)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-700 hover:bg-blue-50/40"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-semibold">F22 {year}</span>
                    <span className="text-gray-500">
                      ({Object.keys(data?.codigos ?? {}).length} códigos)
                    </span>
                  </span>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" aria-hidden />
                  ) : (
                    <ChevronDown className="h-4 w-4" aria-hidden />
                  )}
                </button>
                {isOpen && data && <F22YearTable data={data} />}
              </div>
            );
          })}
      </div>
    </div>
  );
}

function F22Item({
  label,
  value,
  code,
  highlight,
}: {
  label: string;
  value: string;
  code: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] text-gray-500 uppercase tracking-wide leading-tight">
        {label} <span className="text-gray-400 normal-case">({code})</span>
      </dt>
      <dd
        className={`mt-0.5 tabular-nums ${highlight ? "text-base font-bold text-gray-900" : "text-sm font-medium text-gray-800"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function F22YearTable({ data }: { data: F22YearData }) {
  // Ordenar códigos: primero los conocidos en orden estándar, luego el resto numéricamente.
  const allCodes = Object.keys(data.codigos);
  const known = allCodes
    .filter((c) => f22CodeLabel(c))
    .sort((a, b) => Number(a) - Number(b));
  const unknown = allCodes
    .filter((c) => !f22CodeLabel(c))
    .sort((a, b) => Number(a) - Number(b));
  const ordered = [...known, ...unknown];

  return (
    <div className="border-t border-blue-100">
      <table className="w-full text-[11px]">
        <thead className="bg-blue-50/60 text-blue-900">
          <tr>
            <th className="px-3 py-1.5 text-left font-medium w-16">Código</th>
            <th className="px-3 py-1.5 text-left font-medium">Glosa</th>
            <th className="px-3 py-1.5 text-right font-medium">Valor</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((code) => {
            const label = f22CodeLabel(code);
            const value = data.codigos[code];
            const isHighlight = label && Number(value) > 0;
            // Si el valor parece numérico, formatear como CLP. Si no (ej. nombres), dejarlo.
            const display = /^-?\d+$/.test(value) ? fmtCLP(Number(value)) : value;
            return (
              <tr
                key={code}
                className={`border-t border-blue-50 ${isHighlight ? "bg-blue-50/30" : ""}`}
              >
                <td className="px-3 py-1 text-gray-600 tabular-nums">{code}</td>
                <td className="px-3 py-1 text-gray-700">
                  {label ?? <span className="text-gray-400 italic">sin glosa</span>}
                </td>
                <td className="px-3 py-1 text-right tabular-nums text-gray-900">{display}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DeudaDetail({ cmf }: { cmf: NonNullable<FloidWidgetReport["cmf"]> }) {
  const moroso = cmf.totalDebt30To89 + cmf.totalDebt90Plus;
  const lineasTotal = cmf.totalLinesDirect + cmf.totalLinesIndirect;
  return (
    <section className="rounded-xl border border-violet-100 bg-violet-50/40 p-5 space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-violet-900">
        <CreditCard className="h-4 w-4" aria-hidden />
        Deuda — CMF
        {cmf.updated && <span className="text-xs font-normal text-gray-500">· actualizada {cmf.updated}</span>}
      </h3>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <DLItem label="Deuda directa" value={fmtCLP(cmf.totalDirectDebt)} />
        <DLItem label="Deuda indirecta" value={fmtCLP(cmf.totalIndirectDebt)} />
        <DLItem label="Mora >30 días" value={fmtCLP(cmf.totalDebt30To89)} alert={cmf.totalDebt30To89 > 0} />
        <DLItem label="Mora >90 días" value={fmtCLP(cmf.totalDebt90Plus)} alert={cmf.totalDebt90Plus > 0} />
        <DLItem label="Líneas disponibles" value={fmtCLP(lineasTotal)} />
        <DLItem label="Total deuda" value={fmtCLP(cmf.totalDebt)} highlight />
      </dl>

      {moroso > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800">
          ⚠ Hay deuda morosa por {fmtCLP(moroso)}.
        </div>
      )}

      {cmf.directDebt.length > 0 && (
        <DebtTable title="Deuda directa" rows={cmf.directDebt} />
      )}
      {cmf.indirectDebt.length > 0 && (
        <DebtTable title="Deuda indirecta" rows={cmf.indirectDebt} />
      )}
      {cmf.creditLines.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-gray-700">Líneas de crédito disponibles</h4>
          <div className="overflow-x-auto rounded-lg border border-violet-100 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-violet-50 text-violet-900">
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium">Institución</th>
                  <th className="px-3 py-1.5 text-right font-medium">Directa</th>
                  <th className="px-3 py-1.5 text-right font-medium">Indirecta</th>
                </tr>
              </thead>
              <tbody>
                {cmf.creditLines.map((l, i) => (
                  <tr key={`${l.institution}-${i}`} className="border-t border-violet-50">
                    <td className="px-3 py-1.5">{l.institution}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmtCLP(l.direct)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{fmtCLP(l.indirect)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function DebtTable({
  title,
  rows,
}: {
  title: string;
  rows: NonNullable<FloidWidgetReport["cmf"]>["directDebt"];
}) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-semibold text-gray-700">{title}</h4>
      <div className="overflow-x-auto rounded-lg border border-violet-100 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-violet-50 text-violet-900">
            <tr>
              <th className="px-3 py-1.5 text-left font-medium">Institución</th>
              <th className="px-3 py-1.5 text-right font-medium">Vigente</th>
              <th className="px-3 py-1.5 text-right font-medium">30–89d</th>
              <th className="px-3 py-1.5 text-right font-medium">90+d</th>
              <th className="px-3 py-1.5 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d, i) => (
              <tr key={`${d.institution}-${i}`} className="border-t border-violet-50">
                <td className="px-3 py-1.5">{d.institution}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{fmtCLP(d.currentDebt)}</td>
                <td
                  className={`px-3 py-1.5 text-right tabular-nums ${d.between30To89Days > 0 ? "text-red-700 font-medium" : ""}`}
                >
                  {fmtCLP(d.between30To89Days)}
                </td>
                <td
                  className={`px-3 py-1.5 text-right tabular-nums ${d.over90Days > 0 ? "text-red-700 font-medium" : ""}`}
                >
                  {fmtCLP(d.over90Days)}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums font-semibold">
                  {fmtCLP(d.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DLItem({
  label,
  value,
  highlight,
  alert,
  colspan,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  alert?: boolean;
  colspan?: boolean;
}) {
  return (
    <div className={colspan ? "sm:col-span-2" : ""}>
      <dt className="text-xs text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd
        className={`mt-0.5 tabular-nums ${highlight ? "text-base font-bold text-gray-900" : alert ? "text-sm font-medium text-red-700" : "text-sm font-medium text-gray-800"}`}
      >
        {value}
      </dd>
    </div>
  );
}
