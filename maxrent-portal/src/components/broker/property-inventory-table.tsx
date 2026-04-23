"use client";

/**
 * Shared property grid for staff (admin table, expandable detail, publish segment),
 * broker (catalog grid read-only: sin reservar inventario), and investor (same grid, blue/gray
 * theme → `POST /api/reservations`).
 *
 * @domain maxrent-portal
 * @see staffPropertyListDisplay
 * @see staffPropertyExpandedFields
 */

import Link from "next/link";
import { Fragment, useCallback, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight } from "lucide-react";
import {
  staffPropertyExpandedFields,
  staffPropertyListDisplay,
  type StaffPropertyListDisplay,
} from "@/lib/broker/property-metadata-display";
import { redirectToReservationCheckout } from "@/lib/portal/investor-reservation-checkout";
export type StaffReservationSummary = {
  channel: "broker" | "investor";
  userId: string;
  email: string | null;
  name: string | null;
  reservedAt: string | null;
};

export type PropertyInventoryRow = {
  id: string;
  title: string;
  status: string;
  metadata: unknown;
  houmPropertyId?: string | null;
  /** Clave de negocio para import CSV (upsert). */
  inventoryCode?: string | null;
  visibleToBrokers?: boolean;
  /** Investor: user already has an active reservation for this property id. */
  investorHasActiveReservation?: boolean;
  /** Staff inventario: quién tiene la reserva cuando `status` es `RESERVED`. */
  staffReservationSummary?: StaffReservationSummary | null;
};

const STATUSES = ["AVAILABLE", "RESERVED", "SOLD", "ARCHIVED"] as const;

const PROPERTY_STATUS_LABEL: Record<(typeof STATUSES)[number], string> = {
  AVAILABLE: "Disponible",
  RESERVED: "Reservado",
  SOLD: "Vendido",
  ARCHIVED: "Archivado",
};

/** Staff row controls: same height for select, links, buttons, Publicado segment. */
const STAFF_CONTROL_H =
  "h-9 min-h-[2.25rem] rounded-md border border-gray-300 bg-white text-xs font-medium text-gray-900";

const GRID_BROKER =
  "grid grid-cols-[minmax(140px,2fr)_0.65fr_0.65fr_1fr_0.85fr_1fr_minmax(4.5rem,0.9fr)_minmax(4.5rem,0.9fr)_minmax(5.5rem,1fr)] gap-0";

/** Broker catalog: Mapa + Ver only (no inventory «Reservar»). */
const GRID_BROKER_NO_ACTION =
  "grid grid-cols-[minmax(140px,2fr)_0.65fr_0.65fr_1fr_0.85fr_1fr_minmax(4.5rem,0.9fr)_minmax(4.5rem,0.9fr)] gap-0";

const BROKER_BTN =
  "inline-flex h-8 min-h-[2rem] items-center justify-center rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-medium text-broker-navy transition-colors hover:border-blue-200 hover:bg-broker-accent-soft hover:text-broker-accent";

/** Secondary actions in investor catalog (Mapa / Ver). */
const INVESTOR_SECONDARY_BTN =
  "inline-flex h-8 min-h-[2rem] items-center justify-center rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-800 transition-colors hover:bg-gray-50";

const STAFF_ROW_TOGGLE_SKIP = "button, a, select, [data-stop-row-toggle]";

type BrokerSortKey = "propiedad" | "m2" | "dorm" | "arriendo" | "cap" | "venta";
type BrokerSortState = { key: BrokerSortKey; dir: "asc" | "desc" } | null;

type BrokerEnrichedRow = {
  p: PropertyInventoryRow;
  d: StaffPropertyListDisplay;
  originalIndex: number;
};

function parseBrokerDisplayNumber(s: string): number | null {
  if (s === "—" || !String(s).trim()) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function compareNullableNumber(a: number | null, b: number | null): number {
  const aMissing = a == null || Number.isNaN(a);
  const bMissing = b == null || Number.isNaN(b);
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  return a - b;
}

interface BrokerSortHeaderProps {
  label: string;
  sortKey: BrokerSortKey;
  sort: BrokerSortState;
  align: "left" | "center" | "right";
  onCycleSort: (key: BrokerSortKey) => void;
  /** Investor catalog uses neutral grays / blue focus. */
  tone?: "broker" | "investor";
}

/**
 * Click cycles sort: ascending → descending → original row order.
 */
function BrokerSortHeader({
  label,
  sortKey,
  sort,
  align,
  onCycleSort,
  tone = "broker",
}: BrokerSortHeaderProps) {
  const active = sort?.key === sortKey;
  const dir = active ? sort.dir : null;
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  const alignClass =
    align === "left" ? "justify-start" : align === "center" ? "justify-center" : "justify-end";
  const ariaSort = !active ? "none" : dir === "asc" ? "ascending" : "descending";
  const ariaLabel = !active
    ? `Ordenar por ${label}, de menor a mayor`
    : dir === "asc"
      ? `Ordenar por ${label}, de mayor a menor`
      : `Quitar orden por ${label}`;

  const inv = tone === "investor";
  const labelTone = inv
    ? "text-gray-600 hover:bg-white/80 hover:text-gray-900 focus-visible:ring-blue-500"
    : "text-broker-muted hover:bg-white/80 hover:text-broker-navy focus-visible:ring-broker-accent";
  const activeIcon = inv ? "text-blue-600" : "text-broker-accent";

  return (
    <button
      type="button"
      role="columnheader"
      onClick={() => onCycleSort(sortKey)}
      aria-sort={ariaSort}
      aria-label={ariaLabel}
      className={`group inline-flex min-h-[1.75rem] w-full min-w-0 max-w-full items-center gap-1 rounded px-1 py-0.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${labelTone} ${alignClass}`}
    >
      <span className="min-w-0 truncate">{label}</span>
      <Icon
        className={`h-3.5 w-3.5 shrink-0 ${
          active ? activeIcon : "text-gray-400 opacity-50 group-hover:opacity-90"
        }`}
        strokeWidth={2}
        aria-hidden
      />
    </button>
  );
}

export interface PropertyInventoryTableProps {
  variant: "staff" | "broker" | "investor";
  rows: PropertyInventoryRow[];
  loading?: boolean;
  emptyLabel?: string;
  /** Investor grid: `available` shows Reservar; `myReserved` shows reserva activa (sin botón). Ignored for `variant="broker"`. */
  brokerListMode?: "available" | "myReserved";
  /** Investor: refetch list after a successful reserve. */
  onReserveComplete?: () => void;
  /** Investor: COMPLETED evaluation id for `POST /api/reservations`. */
  investorEvaluationId?: string | null;
  /** Investor: if false, «Reservar» is disabled (catalog visible without completed eval). Default true. */
  investorCanReserve?: boolean;
  onVisibleChange?: (id: string, visible: boolean) => void;
  onStatusChange?: (id: string, status: string) => void;
  onDelete?: (id: string) => void;
}

export function PropertyInventoryTable({
  variant,
  rows,
  loading,
  emptyLabel = "Sin filas.",
  brokerListMode = "available",
  onReserveComplete,
  investorEvaluationId,
  investorCanReserve,
  onVisibleChange,
  onStatusChange,
  onDelete,
}: PropertyInventoryTableProps) {
  const investorReserveBlocked = variant === "investor" && investorCanReserve === false;

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reservingId, setReservingId] = useState<string | null>(null);
  const [reserveError, setReserveError] = useState<string | null>(null);
  const [brokerSort, setBrokerSort] = useState<BrokerSortState>(null);

  const cycleBrokerSort = useCallback((key: BrokerSortKey) => {
    setBrokerSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }, []);

  const brokerSortedRows = useMemo((): BrokerEnrichedRow[] => {
    if (variant !== "broker" && variant !== "investor") return [];
    const enriched: BrokerEnrichedRow[] = rows.map((p, originalIndex) => ({
      p,
      d: staffPropertyListDisplay(p.title, p.metadata),
      originalIndex,
    }));
    if (!brokerSort) return enriched;
    const mult = brokerSort.dir === "asc" ? 1 : -1;
    return [...enriched].sort((a, b) => {
      let cmp = 0;
      switch (brokerSort.key) {
        case "propiedad":
          cmp = a.d.headline.localeCompare(b.d.headline, "es", { sensitivity: "base" });
          break;
        case "m2":
          cmp = compareNullableNumber(
            parseBrokerDisplayNumber(a.d.m2),
            parseBrokerDisplayNumber(b.d.m2)
          );
          break;
        case "dorm":
          cmp = compareNullableNumber(
            parseBrokerDisplayNumber(a.d.dorm),
            parseBrokerDisplayNumber(b.d.dorm)
          );
          break;
        case "arriendo":
          cmp = compareNullableNumber(a.d.sortRentClp, b.d.sortRentClp);
          break;
        case "cap":
          cmp = compareNullableNumber(a.d.capRatePct, b.d.capRatePct);
          break;
        case "venta":
          cmp = compareNullableNumber(a.d.sortSaleClp, b.d.sortSaleClp);
          break;
        default:
          cmp = 0;
      }
      if (cmp !== 0) return cmp * mult;
      return a.originalIndex - b.originalIndex;
    });
  }, [variant, rows, brokerSort]);

  async function submitReserve(propertyId: string, propertyName?: string) {
    setReserveError(null);
    setReservingId(propertyId);
    try {
      if (variant === "investor") {
        if (!investorEvaluationId) {
          setReserveError("No hay evaluación disponible para reservar.");
          return;
        }
        const res = await fetch("/api/reservations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId,
            evaluationId: investorEvaluationId,
            ...(propertyName != null && propertyName.trim()
              ? { propertyName: propertyName.trim() }
              : {}),
          }),
        });
        const data = (await res.json()) as {
          error?: string;
          reservation?: { id: string };
        };
        if (!res.ok) {
          setReserveError(data.error || "No se pudo crear la reserva");
          return;
        }
        const reservationId = data.reservation?.id;
        if (!reservationId) {
          setReserveError("Respuesta inválida del servidor");
          return;
        }
        const checkout = await redirectToReservationCheckout(reservationId);
        if (!checkout.ok) {
          setReserveError(
            `${checkout.error} Podés intentar de nuevo desde Oportunidades (la reserva quedó pendiente de pago).`
          );
          return;
        }
        onReserveComplete?.();
      }
    } catch {
      setReserveError("Error de red al reservar");
    } finally {
      setReservingId(null);
    }
  }

  const mutedText = variant === "investor" ? "text-gray-600" : "text-broker-muted";

  if (loading) {
    return <p className={`p-4 text-sm ${mutedText}`}>Cargando…</p>;
  }
  if (rows.length === 0) {
    return <p className={`p-4 text-sm ${mutedText}`}>{emptyLabel}</p>;
  }

  if (variant === "staff") {
    const colCount = 12;

    return (
      <div className="w-full min-w-0 overflow-x-auto">
        <table className="w-full min-w-0 table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-7" />
            <col style={{ width: "24%" }} />
            <col style={{ width: "5%" }} />
            <col style={{ width: "5%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "7%" }} />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/90 text-gray-600">
              <th className="px-1 py-2" aria-hidden />
              <th className="px-2 py-2 pr-1 text-left text-xs font-semibold tracking-tight">
                Propiedad
              </th>
              <th className="px-1 py-2 text-center text-xs font-semibold tracking-tight">m²</th>
              <th className="px-1 py-2 text-center text-xs font-semibold tracking-tight">Dorm</th>
              <th className="px-1.5 py-2 text-right text-xs font-semibold tracking-tight">
                Arriendo
              </th>
              <th className="px-1 py-2 text-right text-xs font-semibold tracking-tight">Cap</th>
              <th className="px-1.5 py-2 text-right text-xs font-semibold tracking-tight">Venta</th>
              <th className="px-1.5 py-2 text-left text-xs font-semibold leading-tight tracking-tight">
                Publicado
              </th>
              <th className="px-1.5 py-2 text-left text-xs font-semibold tracking-tight">Estado</th>
              <th className="px-1 py-2 text-left text-xs font-semibold leading-tight tracking-tight">
                Reservado por
              </th>
              <th className="px-1 py-2 text-center text-xs font-semibold tracking-tight">Mapa</th>
              <th className="px-1.5 py-2 text-right text-xs font-semibold tracking-tight">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((p) => {
              const d = staffPropertyListDisplay(p.title, p.metadata);
              const mapOk =
                d.lat != null && d.lng != null && Number.isFinite(d.lat) && Number.isFinite(d.lng);
              const mapHref = mapOk ? `https://www.google.com/maps?q=${d.lat},${d.lng}` : null;
              const expanded = expandedId === p.id;
              const detail = staffPropertyExpandedFields({
                id: p.id,
                title: p.title,
                status: p.status,
                visibleToBrokers: Boolean(p.visibleToBrokers),
                inventoryCode: p.inventoryCode,
                houmPropertyId: p.houmPropertyId,
                metadata: p.metadata,
              });

              return (
                <Fragment key={p.id}>
                  <tr
                    className={
                      expanded
                        ? "bg-gray-50/70 cursor-pointer hover:bg-gray-50"
                        : "cursor-pointer hover:bg-gray-50/90"
                    }
                    onClick={(e) => {
                      const el = e.target as HTMLElement;
                      if (el.closest(STAFF_ROW_TOGGLE_SKIP)) return;
                      setExpandedId((id) => (id === p.id ? null : p.id));
                    }}
                  >
                    <td className="px-0.5 py-2 align-top text-gray-400" aria-hidden>
                      {expanded ? (
                        <ChevronDown className="mx-auto mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                      ) : (
                        <ChevronRight className="mx-auto mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                      )}
                    </td>
                    <td className="min-w-0 px-2 py-2 align-top text-left">
                      <div className="flex flex-col gap-0.5 text-left">
                        <div className="truncate text-[0.8125rem] font-semibold leading-snug text-gray-900">
                          {d.headline}
                        </div>
                        <div
                          className="truncate text-[0.6875rem] leading-snug text-gray-600"
                          title={
                            [d.subline, d.addressLine].filter(Boolean).join(" · ") || undefined
                          }
                        >
                          {[d.subline, d.addressLine].filter(Boolean).join(" · ") || "—"}
                        </div>
                        <div
                          className="truncate font-mono text-[0.625rem] leading-tight text-gray-500"
                          title={
                            [
                              p.inventoryCode,
                              `id ${p.id.slice(0, 8)}…`,
                              p.houmPropertyId && `Houm ${p.houmPropertyId}`,
                            ]
                              .filter(Boolean)
                              .join(" · ") || undefined
                          }
                        >
                          {[
                            p.inventoryCode,
                            `id ${p.id.slice(0, 8)}…`,
                            p.houmPropertyId ? `Houm ${p.houmPropertyId}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </div>
                      </div>
                    </td>
                    <td className="min-w-0 px-0.5 py-2 text-center align-middle text-[0.8125rem] tabular-nums text-gray-900">
                      {d.m2}
                    </td>
                    <td className="min-w-0 px-0.5 py-2 text-center align-middle text-[0.8125rem] tabular-nums text-gray-900">
                      {d.dorm}
                    </td>
                    <td className="min-w-0 px-1 py-2 text-right align-middle text-[0.6875rem] font-medium leading-tight text-gray-800 tabular-nums">
                      <span className="block truncate" title={d.arriendoCell}>
                        {d.arriendoCell}
                      </span>
                    </td>
                    <td className="min-w-0 px-0.5 py-2 text-right align-middle">
                      <span
                        className="block truncate text-[0.6875rem] font-medium tabular-nums leading-tight text-gray-600"
                        title={d.capRateLabel}
                      >
                        {d.capRateLabel}
                      </span>
                    </td>
                    <td className="min-w-0 px-1 py-2 text-right align-middle text-[0.6875rem] font-medium leading-tight text-gray-800 tabular-nums">
                      <span className="block truncate" title={d.ventaCell}>
                        {d.ventaCell}
                      </span>
                    </td>
                    <td className="min-w-0 px-1 py-2 align-middle">
                      <div
                        data-stop-row-toggle
                        className="flex h-9 min-h-[2.25rem] w-full min-w-0 overflow-hidden rounded-md border border-gray-300 bg-white"
                      >
                        <button
                          type="button"
                          title="No publicado en portal broker"
                          className={
                            !p.visibleToBrokers
                              ? "flex min-w-0 flex-1 items-center justify-center bg-gray-100 text-xs font-medium text-gray-900"
                              : "flex min-w-0 flex-1 items-center justify-center text-xs font-medium text-gray-500 hover:bg-gray-50"
                          }
                          onClick={() => {
                            if (!p.visibleToBrokers) return;
                            onVisibleChange?.(p.id, false);
                          }}
                        >
                          No
                        </button>
                        <button
                          type="button"
                          title="Publicado en portal broker"
                          className={
                            p.visibleToBrokers
                              ? "flex min-w-0 flex-1 items-center justify-center bg-gray-100 text-xs font-medium text-gray-900"
                              : "flex min-w-0 flex-1 items-center justify-center text-xs font-medium text-gray-500 hover:bg-gray-50"
                          }
                          onClick={() => {
                            if (p.visibleToBrokers) return;
                            onVisibleChange?.(p.id, true);
                          }}
                        >
                          Sí
                        </button>
                      </div>
                    </td>
                    <td className="min-w-0 px-1 py-2 align-middle">
                      <select
                        className={`${STAFF_CONTROL_H} w-full max-w-full px-2 shadow-sm`}
                        value={p.status}
                        onChange={(e) => onStatusChange?.(p.id, e.target.value)}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {PROPERTY_STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="min-w-0 px-1 py-2 align-middle">
                      {p.staffReservationSummary ? (
                        <div className="min-w-0 text-left text-[0.6875rem] leading-tight">
                          <div className="font-semibold text-gray-800">
                            {p.staffReservationSummary.channel === "broker"
                              ? "Broker"
                              : "Inversionista"}
                          </div>
                          <div
                            className="truncate text-gray-600"
                            title={
                              [
                                p.staffReservationSummary.name,
                                p.staffReservationSummary.email,
                              ]
                                .filter(Boolean)
                                .join(" · ") || p.staffReservationSummary.userId
                            }
                          >
                            {p.staffReservationSummary.name ||
                              p.staffReservationSummary.email ||
                              `${p.staffReservationSummary.userId.slice(0, 8)}…`}
                          </div>
                        </div>
                      ) : p.status === "RESERVED" ? (
                        <span className="text-[0.6875rem] text-amber-800" title="Sin claves de auditoría en metadata">
                          Sin dato
                        </span>
                      ) : (
                        <span className="text-[0.6875rem] text-gray-400">—</span>
                      )}
                    </td>
                    <td className="min-w-0 px-0.5 py-2 text-center align-middle">
                      {mapHref ? (
                        <a
                          href={mapHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${STAFF_CONTROL_H} inline-flex w-full max-w-[5.5rem] items-center justify-center font-medium text-gray-800 shadow-sm hover:bg-gray-50`}
                        >
                          Mapa
                        </a>
                      ) : (
                        <span className="inline-flex h-9 items-center justify-center text-xs text-gray-400">
                          —
                        </span>
                      )}
                    </td>
                    <td className="min-w-0 px-1 py-2 text-right align-middle">
                      <button
                        type="button"
                        className={`${STAFF_CONTROL_H} inline-flex max-w-full items-center justify-center px-3 font-medium text-red-700 shadow-sm hover:border-red-300 hover:bg-red-50`}
                        onClick={() => onDelete?.(p.id)}
                      >
                        Borrar
                      </button>
                    </td>
                  </tr>
                  {expanded ? (
                    <tr className="bg-gray-50/90">
                      <td colSpan={colCount} className="border-t border-gray-100 px-4 py-4">
                        <div className="grid gap-6 lg:grid-cols-2">
                          <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                              Detalle
                            </h3>
                            <dl className="grid grid-cols-[minmax(0,auto)_1fr] gap-x-4 gap-y-2 text-sm">
                              {detail.rows.map((row) => (
                                <Fragment key={row.label}>
                                  <dt className="text-gray-500 whitespace-nowrap">{row.label}</dt>
                                  <dd className="text-gray-900 break-words min-w-0">{row.value}</dd>
                                </Fragment>
                              ))}
                            </dl>
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                              Metadata (JSON)
                            </h3>
                            <pre className="max-h-64 overflow-auto rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-800 font-mono leading-relaxed">
                              {detail.metadataJson}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  const inv = variant === "investor";
  const brokerGrid = inv ? GRID_BROKER : GRID_BROKER_NO_ACTION;
  const sortTone = inv ? "investor" : "broker";
  const headerRow = inv
    ? `${brokerGrid} border-b border-gray-200 bg-gray-50 px-3 py-2.5 text-left text-xs font-medium text-gray-600`
    : `${brokerGrid} border-b border-gray-100 bg-broker-accent-soft px-3 py-2.5 text-left text-xs font-medium text-broker-muted`;
  const dataRow = inv
    ? `${brokerGrid} items-stretch px-3 py-2.5 text-sm text-gray-900 hover:bg-gray-50/90`
    : `${brokerGrid} items-stretch px-3 py-2.5 text-sm text-broker-navy hover:bg-broker-canvas/80`;
  const titleStrong = inv ? "text-gray-900" : "text-broker-navy";
  const subMuted = inv ? "text-gray-500" : "text-broker-muted";
  const subMutedAddr = inv ? "text-gray-500" : "text-broker-muted/90";
  const cellNum = inv ? "text-gray-900" : "text-broker-navy";
  const capCell = inv ? "text-gray-600" : "text-broker-muted";
  const secondaryBtn = inv ? INVESTOR_SECONDARY_BTN : BROKER_BTN;
  const reserveBtn =
    "w-full max-w-[6.5rem] rounded-lg bg-blue-600 px-2 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-wait disabled:opacity-50";
  const investorReservedLabel =
    "inline-flex w-full max-w-[6.5rem] cursor-default select-none items-center justify-center rounded-lg border border-blue-200 bg-blue-50/90 px-2 py-1.5 text-xs font-medium text-blue-800";
  const activeBadge = inv
    ? "inline-flex w-full max-w-[6.5rem] items-center justify-center rounded-lg border border-blue-100 bg-blue-50 px-2 py-1.5 text-xs font-medium text-blue-800"
    : "inline-flex w-full max-w-[6.5rem] items-center justify-center rounded-lg border border-blue-100 bg-broker-accent-soft px-2 py-1.5 text-xs font-medium text-broker-accent";
  const staticColHeader = inv ? "text-gray-600" : "text-broker-muted";

  return (
    <div className="overflow-x-auto">
      <div className={inv ? "min-w-[880px]" : "min-w-[760px]"}>
        {inv && reserveError ? (
          <p
            className="mx-3 mt-3 rounded-md border border-red-100 bg-red-50/80 px-3 py-2 text-xs text-red-800"
            role="alert"
          >
            {reserveError}
          </p>
        ) : null}
        <div className={headerRow} role="row">
          <div className="min-w-0 px-1 py-0.5">
            <BrokerSortHeader
              label="Propiedad"
              sortKey="propiedad"
              sort={brokerSort}
              align="left"
              onCycleSort={cycleBrokerSort}
              tone={sortTone}
            />
          </div>
          <div className="px-1 py-0.5">
            <BrokerSortHeader
              label="m²"
              sortKey="m2"
              sort={brokerSort}
              align="center"
              onCycleSort={cycleBrokerSort}
              tone={sortTone}
            />
          </div>
          <div className="px-1 py-0.5">
            <BrokerSortHeader
              label="Dorm"
              sortKey="dorm"
              sort={brokerSort}
              align="center"
              onCycleSort={cycleBrokerSort}
              tone={sortTone}
            />
          </div>
          <div className="px-1 py-0.5">
            <BrokerSortHeader
              label="Arriendo"
              sortKey="arriendo"
              sort={brokerSort}
              align="right"
              onCycleSort={cycleBrokerSort}
              tone={sortTone}
            />
          </div>
          <div className="px-1 py-0.5">
            <BrokerSortHeader
              label="Cap"
              sortKey="cap"
              sort={brokerSort}
              align="right"
              onCycleSort={cycleBrokerSort}
              tone={sortTone}
            />
          </div>
          <div className="px-1 py-0.5">
            <BrokerSortHeader
              label="Venta"
              sortKey="venta"
              sort={brokerSort}
              align="right"
              onCycleSort={cycleBrokerSort}
              tone={sortTone}
            />
          </div>
          <div
            className={`px-1 py-0.5 text-center text-xs font-medium ${staticColHeader}`}
            role="columnheader"
          >
            Mapa
          </div>
          <div
            className={`px-1 py-0.5 text-center text-xs font-medium ${staticColHeader}`}
            role="columnheader"
          >
            Detalle
          </div>
          {inv ? (
            <div
              className={`px-1 py-0.5 text-center text-xs font-medium ${staticColHeader}`}
              role="columnheader"
            >
              {brokerListMode === "myReserved" ? "Reserva" : "Acción"}
            </div>
          ) : null}
        </div>
        <div className="divide-y divide-gray-100 bg-white">
          {brokerSortedRows.map(({ p, d }) => {
            const mapOk =
              d.lat != null && d.lng != null && Number.isFinite(d.lat) && Number.isFinite(d.lng);
            const mapHref = mapOk ? `https://www.google.com/maps?q=${d.lat},${d.lng}` : null;
            const idsLine = [
              p.inventoryCode,
              `id ${p.id.slice(0, 8)}…`,
              p.houmPropertyId ? `Houm ${p.houmPropertyId}` : null,
            ]
              .filter(Boolean)
              .join(" · ");
            const detailHref = inv ? `/reserva/propiedad/${p.id}` : `/broker/oportunidades/${p.id}`;

            return (
              <div key={p.id} role="row" className={dataRow}>
                <div className="min-w-0 pr-2 text-left">
                  <div className={`truncate font-semibold ${titleStrong}`}>{d.headline}</div>
                  {d.subline ? (
                    <div className={`truncate text-xs ${subMuted}`}>{d.subline}</div>
                  ) : null}
                  {d.addressLine ? (
                    <div className={`truncate text-xs ${subMutedAddr}`} title={d.addressLine}>
                      {d.addressLine}
                    </div>
                  ) : null}
                  {idsLine ? (
                    <div
                      className="mt-0.5 truncate font-mono text-[0.65rem] text-gray-400"
                      title={idsLine}
                    >
                      {idsLine}
                    </div>
                  ) : null}
                </div>
                <div className={`flex items-center justify-center tabular-nums text-sm ${cellNum}`}>
                  {d.m2}
                </div>
                <div className={`flex items-center justify-center tabular-nums text-sm ${cellNum}`}>
                  {d.dorm}
                </div>
                <div
                  className={`flex items-center justify-end text-right text-sm font-medium tabular-nums ${cellNum}`}
                >
                  <span className="truncate">{d.arriendoCell}</span>
                </div>
                <div className={`flex items-center justify-end text-right text-sm tabular-nums ${capCell}`}>
                  <span className="truncate">{d.capRateLabel}</span>
                </div>
                <div
                  className={`flex items-center justify-end text-right text-sm font-medium tabular-nums ${cellNum}`}
                >
                  <span className="truncate">{d.ventaCell}</span>
                </div>
                <div className="flex items-center justify-center">
                  {mapHref ? (
                    <a
                      href={mapHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={secondaryBtn}
                    >
                      Mapa
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>
                <div className="flex items-center justify-center">
                  <Link href={detailHref} className={secondaryBtn}>
                    Ver
                  </Link>
                </div>
                {inv ? (
                  <div className="flex min-w-0 items-center justify-center">
                    {brokerListMode === "myReserved" ? (
                      <span className={activeBadge}>Activa</span>
                    ) : p.investorHasActiveReservation ? (
                      <span
                        className={investorReservedLabel}
                        title="Ya tenés una reserva activa para esta propiedad"
                      >
                        Reservado
                      </span>
                    ) : p.status === "AVAILABLE" ? (
                      <button
                        type="button"
                        disabled={reservingId === p.id || investorReserveBlocked}
                        title={
                          investorReserveBlocked
                            ? "Completá tu evaluación crediticia para reservar"
                            : undefined
                        }
                        onClick={() => void submitReserve(p.id, d.headline)}
                        className={reserveBtn}
                      >
                        {reservingId === p.id ? "…" : "Reservar"}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

