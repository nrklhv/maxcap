"use client";

/**
 * Staff active investor reservations (`Reservation` rows). Flow: choose «Cancelar reserva» on a row,
 * then «Aprobar cambios» opens a warning dialog and «Confirmar y ejecutar» runs the API.
 *
 * @domain maxrent-portal
 * @see GET /api/staff/properties/reservations
 * @see POST /api/staff/reservations/:id/cancel
 */

import { useCallback, useEffect, useId, useState } from "react";
import type { StaffUnifiedReservationRow } from "@/lib/services/property.service";

const INVESTOR_STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Pendiente de pago",
  PAYMENT_PROCESSING: "Procesando pago",
  PAID: "Pagada",
  CONFIRMED: "Confirmada",
};

type PendingAction = {
  propertyId: string;
  reservationId: string;
  propertyTitle: string;
};

function formatReservedAt(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function rowKey(r: StaffUnifiedReservationRow): string {
  return r.reservationId;
}

function isRowPending(r: StaffUnifiedReservationRow, pending: PendingAction | null): boolean {
  if (!pending) return false;
  return pending.reservationId === r.reservationId && pending.propertyId === r.propertyId;
}

export interface StaffAllReservationsProps {
  onReleased?: () => void;
}

export function StaffAllReservations({ onReleased }: StaffAllReservationsProps) {
  const dialogTitleId = useId();
  const dialogDescId = useId();

  const [rows, setRows] = useState<StaffUnifiedReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [executing, setExecuting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/properties/reservations");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo cargar");
        return;
      }
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function executePending(): Promise<boolean> {
    const p = pendingAction;
    if (!p) return false;
    setExecuting(true);
    setError(null);
    try {
      const res = await fetch(`/api/staff/reservations/${p.reservationId}/cancel`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo cancelar la reserva");
        return false;
      }
      setPendingAction(null);
      setConfirmOpen(false);
      await load();
      onReleased?.();
      return true;
    } catch {
      setError("Error de red");
      return false;
    } finally {
      setExecuting(false);
    }
  }

  if (loading) {
    return <p className="p-4 text-sm text-gray-500">Cargando reservas…</p>;
  }
  if (error && rows.length === 0) {
    return <p className="p-4 text-sm text-red-600">{error}</p>;
  }
  if (rows.length === 0) {
    return (
      <p className="p-6 text-sm text-gray-600 text-center border border-dashed border-gray-200 rounded-lg">
        No hay reservas activas de inversionistas en este momento.
      </p>
    );
  }

  const confirmSubtitle = pendingAction
    ? `Se va a cancelar la reserva inversionista sobre «${pendingAction.propertyTitle}» (estado CANCELLED) y se reconciliará el inventario para que la propiedad vuelva a estar disponible si corresponde.`
    : "";

  return (
    <div className="w-full min-w-0 space-y-3">
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2.5">
        <p className="text-xs text-amber-950 max-w-xl">
          Primero elegí en la tabla <strong>Cancelar reserva</strong>. Después pulsá{" "}
          <strong>Aprobar cambios</strong>: se abrirá un aviso y podrás confirmar la ejecución.
        </p>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {pendingAction ? (
            <button
              type="button"
              onClick={() => {
                setPendingAction(null);
                setConfirmOpen(false);
              }}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50"
            >
              Descartar selección
            </button>
          ) : null}
          <button
            type="button"
            disabled={!pendingAction}
            title={
              pendingAction
                ? undefined
                : "Elegí primero una acción en una fila de la tabla (Cancelar reserva)."
            }
            onClick={() => pendingAction && setConfirmOpen(true)}
            className="rounded-md bg-amber-800 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Aprobar cambios
          </button>
        </div>
      </div>

      {confirmOpen && pendingAction ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !executing) setConfirmOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            aria-describedby={dialogDescId}
            className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={dialogTitleId} className="text-base font-semibold text-gray-900">
              Confirmar cambios en inventario
            </h2>
            <p
              id={dialogDescId}
              className="mt-3 text-sm leading-relaxed text-amber-950 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2"
            >
              {confirmSubtitle}
            </p>
            <p className="mt-2 text-xs text-gray-600">
              Esta operación no se puede deshacer desde aquí. Verificá que sea la fila correcta antes de
              confirmar.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={executing}
                onClick={() => setConfirmOpen(false)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={executing}
                onClick={() => void executePending()}
                className="rounded-md bg-amber-800 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-900 disabled:opacity-50"
              >
                {executing ? "Ejecutando…" : "Confirmar y ejecutar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="w-full min-w-0 overflow-x-auto">
        <table className="w-full min-w-[820px] table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[30%]" />
            <col className="w-[24%]" />
            <col className="w-[14%]" />
            <col className="w-[8%]" />
            <col className="w-[14%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide">Propiedad</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide">Reservado por</th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide">Fecha</th>
              <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide">
                Portal
              </th>
              <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide">Estado</th>
              <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide">
                Acción
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => {
              const actorLabel = r.actorName?.trim() || r.actorEmail || r.actorUserId;
              const pending = isRowPending(r, pendingAction);
              const statusLabel =
                INVESTOR_STATUS_LABEL[r.reservationStatus] || r.reservationStatus;

              return (
                <tr
                  key={rowKey(r)}
                  className={
                    pending
                      ? "bg-amber-50/90 ring-1 ring-inset ring-amber-200 hover:bg-amber-50"
                      : "hover:bg-gray-50/80"
                  }
                >
                  <td className="min-w-0 px-3 py-2 align-top">
                    <div className="font-medium text-gray-900 truncate" title={r.propertyTitle}>
                      {r.propertyTitle}
                    </div>
                    {r.inventoryCode ? (
                      <div className="mt-0.5 font-mono text-xs text-gray-500 truncate">
                        {r.inventoryCode}
                      </div>
                    ) : (
                      <div className="mt-0.5 font-mono text-xs text-gray-400 truncate">{r.propertyId}</div>
                    )}
                  </td>
                  <td className="min-w-0 px-3 py-2 align-top text-gray-800">
                    <div className="truncate font-medium" title={actorLabel}>
                      {actorLabel}
                    </div>
                    {r.actorEmail && r.actorName ? (
                      <div className="mt-0.5 truncate text-xs text-gray-500">{r.actorEmail}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 align-top text-gray-700 tabular-nums text-xs">
                    {formatReservedAt(r.reservedAt)}
                  </td>
                  <td className="px-3 py-2 align-middle text-center text-xs text-gray-700">
                    {r.visibleToBrokers ? "Sí" : "No"}
                  </td>
                  <td className="min-w-0 px-3 py-2 align-top text-xs text-gray-800">{statusLabel}</td>
                  <td className="px-3 py-2 align-middle text-right">
                    <button
                      type="button"
                      disabled={executing}
                      onClick={() =>
                        setPendingAction({
                          propertyId: r.propertyId,
                          reservationId: r.reservationId,
                          propertyTitle: r.propertyTitle,
                        })
                      }
                      className={`rounded-md border px-2.5 py-1.5 text-xs font-medium ${
                        pending
                          ? "border-amber-600 bg-amber-100 text-amber-950"
                          : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
                      } disabled:opacity-50`}
                    >
                      {pending ? "Seleccionado" : "Cancelar reserva"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
