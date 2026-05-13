"use client";

/**
 * Staff → detalle de un pool. Muestra unidades CON `internalData` (dirección,
 * depto, raw). Permite:
 *   - Editar status (DRAFT/OPEN/CLOSED), pausa de reservas y descripción.
 *   - Cancelar la reserva activa de una unidad (reusa `/api/staff/reservations/[id]/cancel`).
 *   - Escriturar la reserva activa de una unidad → reserva CONFIRMED + unit SOLD
 *     (reusa `/api/staff/reservations/[id]/escriturar`).
 *
 * @domain maxrent-portal / staff
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";

// ---- Tipos del payload del API staff -------------------------------------

type StaffPool = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: "DRAFT" | "OPEN" | "CLOSED";
  acceptingReservations: boolean;
  capRateBruto: string;
  reservationFeeClp: string;
  totalUnits: number;
  totalValueUf: string | null;
  totalMonthlyRentClp: string | null;
  occupancyPct: number | null;
};

type ActiveReservation = {
  id: string;
  status: string;
  amount: string;
  createdAt: string;
  expiresAt: string | null;
  paidAt: string | null;
  user: { id: string; email: string; name: string | null };
};

type StaffUnit = {
  id: string;
  externalId: string;
  label: string;
  priceUf: string;
  priceClp: string;
  monthlyRentClp: string;
  ocupacion: string;
  comuna: string | null;
  dormitorios: number | null;
  banos: number | null;
  superficieUtilM2: number | null;
  superficieTerrazaM2: number | null;
  saleStatus: "AVAILABLE" | "RESERVED" | "SOLD";
  internalData: unknown;
  activeReservation: ActiveReservation | null;
};

// ---- Helpers de formato --------------------------------------------------

function pct(v: number | null): string {
  return v === null ? "—" : `${v.toFixed(1)}%`;
}
function capRate(s: string): string {
  const n = Number(s);
  return Number.isFinite(n) ? `${(n * 100).toFixed(2).replace(".", ",")}%` : s;
}
function uf(s: string | null): string {
  if (s === null) return "—";
  const n = Number(s);
  return Number.isFinite(n)
    ? n.toLocaleString("es-CL", { maximumFractionDigits: 0 })
    : s;
}
function ufFromString(s: string): string {
  const n = Number(s);
  return Number.isFinite(n)
    ? n.toLocaleString("es-CL", { maximumFractionDigits: 0 })
    : s;
}
function clp(s: string | null): string {
  if (s === null) return "—";
  const n = Number(s);
  return Number.isFinite(n)
    ? `$${n.toLocaleString("es-CL", { maximumFractionDigits: 0 })}`
    : s;
}

function asObject(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return {};
}

// ---- Componente principal ------------------------------------------------

export function StaffPoolDetail({ slug }: { slug: string }) {
  const [pool, setPool] = useState<StaffPool | null>(null);
  const [units, setUnits] = useState<StaffUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/staff/pools/${slug}`);
      const data = (await res.json()) as {
        error?: string;
        pool?: StaffPool;
        units?: StaffUnit[];
      };
      if (!res.ok || !data.pool) {
        setError(data.error || "No se pudo cargar el pool");
        return;
      }
      setPool(data.pool);
      setUnits(data.units ?? []);
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchPool(payload: Partial<Pick<StaffPool, "description" | "status" | "acceptingReservations">>) {
    setActionError(null);
    setActionBusy("patch");
    try {
      const res = await fetch(`/api/staff/pools/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setActionError(data.error || "No se pudo actualizar");
        return;
      }
      await load();
    } catch {
      setActionError("Error de red");
    } finally {
      setActionBusy(null);
    }
  }

  async function cancelReservation(reservationId: string) {
    if (!confirm("¿Cancelar la reserva activa de esta unidad?")) return;
    setActionError(null);
    setActionBusy(`cancel:${reservationId}`);
    try {
      const res = await fetch(`/api/staff/reservations/${reservationId}/cancel`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setActionError(data.error || "No se pudo cancelar");
        return;
      }
      await load();
    } catch {
      setActionError("Error de red");
    } finally {
      setActionBusy(null);
    }
  }

  async function escriturar(reservationId: string) {
    if (
      !confirm(
        "¿Escriturar esta reserva? La unidad pasará a SOLD (estado terminal) y se dispararán los payouts de atribución del usuario."
      )
    ) {
      return;
    }
    setActionError(null);
    setActionBusy(`escri:${reservationId}`);
    try {
      const res = await fetch(`/api/staff/reservations/${reservationId}/escriturar`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setActionError(data.error || "No se pudo escriturar");
        return;
      }
      await load();
    } catch {
      setActionError("Error de red");
    } finally {
      setActionBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }
  if (error || !pool) {
    return (
      <div className="space-y-4">
        <Link
          href="/staff/pools"
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a pools
        </Link>
        <p className="text-sm text-red-600">{error || "No se pudo cargar"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/staff/pools"
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a pools
        </Link>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-gray-900">
              {pool.name}
            </h1>
            <div className="text-xs text-gray-500">
              slug{" "}
              <code className="rounded bg-gray-100 px-1 font-mono">{pool.slug}</code>
            </div>
          </div>
          <Link
            href={`/oportunidades/pools/${pool.slug}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
          >
            Ver como inversionista <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Unidades">{pool.totalUnits}</Stat>
        <Stat label="Cap rate">{capRate(pool.capRateBruto)}</Stat>
        <Stat label="Ocupación">{pct(pool.occupancyPct)}</Stat>
        <Stat label="Valor total (UF)">{uf(pool.totalValueUf)}</Stat>
        <Stat label="Renta total/mes">{clp(pool.totalMonthlyRentClp)}</Stat>
        <Stat label="Reserva por unidad">{clp(pool.reservationFeeClp)}</Stat>
      </div>

      {/* Controles de pool */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">Configuración del pool</h2>
        <p className="mt-1 text-xs text-gray-600">
          DRAFT oculta el pool del portal. CLOSED lo deja visible en lectura. La pausa rápida
          mantiene el pool visible pero deshabilita el botón Reservar.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Estado
            </label>
            <div className="mt-1 flex gap-2">
              {(["DRAFT", "OPEN", "CLOSED"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={actionBusy === "patch" || pool.status === s}
                  onClick={() => void patchPool({ status: s })}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                    pool.status === s
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  } disabled:opacity-50`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Acepta reservas
            </label>
            <div className="mt-1">
              <button
                type="button"
                disabled={actionBusy === "patch"}
                onClick={() => void patchPool({ acceptingReservations: !pool.acceptingReservations })}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  pool.acceptingReservations
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                } disabled:opacity-50`}
              >
                {pool.acceptingReservations ? "Sí · botón pausa" : "Pausado · reactivar"}
              </button>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Descripción pública
            </label>
            <PoolDescriptionForm
              initial={pool.description ?? ""}
              busy={actionBusy === "patch"}
              onSubmit={(description) => void patchPool({ description: description.trim() ? description : null })}
            />
          </div>
        </div>

        {actionError ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {actionError}
          </p>
        ) : null}
      </div>

      {/* Tabla de unidades */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50/90 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">
            Unidades ({units.length})
          </h2>
          <p className="mt-0.5 text-xs text-gray-600">
            Vista interna con dirección exacta y reserva activa por unidad.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50/50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-3 font-medium">ID</th>
                <th className="px-3 py-3 font-medium">Dirección · Depto</th>
                <th className="px-3 py-3 font-medium">Comuna</th>
                <th className="px-3 py-3 font-medium">Ocupación</th>
                <th className="px-3 py-3 font-medium">Sale</th>
                <th className="px-3 py-3 font-medium text-right">UF</th>
                <th className="px-3 py-3 font-medium text-right">Renta</th>
                <th className="px-3 py-3 font-medium">Reserva activa</th>
                <th className="px-3 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {units.map((u) => {
                const meta = asObject(u.internalData);
                const dir = typeof meta.direccionExacta === "string" ? meta.direccionExacta : null;
                const depto = typeof meta.depto === "string" ? meta.depto : null;
                return (
                  <tr key={u.id} className="hover:bg-gray-50/60 align-top">
                    <td className="px-3 py-3 font-mono text-xs text-gray-700">
                      #{u.externalId}
                    </td>
                    <td className="px-3 py-3 text-gray-800">
                      {dir ? <span>{dir}</span> : <span className="text-gray-400">—</span>}
                      {depto ? <span className="text-gray-500"> · {depto}</span> : null}
                    </td>
                    <td className="px-3 py-3 text-gray-700">{u.comuna ?? "—"}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                        {u.ocupacion}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <SaleStatusBadge status={u.saleStatus} />
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{ufFromString(u.priceUf)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      ${Number(u.monthlyRentClp).toLocaleString("es-CL", { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-700">
                      {u.activeReservation ? (
                        <div>
                          <div className="font-medium text-gray-900">
                            {u.activeReservation.user.email}
                          </div>
                          <div className="text-gray-500">
                            {u.activeReservation.status} · $
                            {Number(u.activeReservation.amount).toLocaleString("es-CL")}
                          </div>
                          <div className="text-gray-500">
                            {new Date(u.activeReservation.createdAt).toLocaleDateString("es-CL")}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {u.activeReservation ? (
                        <div className="flex flex-col items-end gap-1">
                          <button
                            type="button"
                            disabled={actionBusy === `cancel:${u.activeReservation.id}`}
                            onClick={() => void cancelReservation(u.activeReservation!.id)}
                            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={actionBusy === `escri:${u.activeReservation.id}`}
                            onClick={() => void escriturar(u.activeReservation!.id)}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            Escriturar (SOLD)
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">{children}</div>
    </div>
  );
}

function SaleStatusBadge({ status }: { status: StaffUnit["saleStatus"] }) {
  if (status === "SOLD") {
    return (
      <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs font-medium text-white">
        SOLD
      </span>
    );
  }
  if (status === "RESERVED") {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
        RESERVED
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">
      AVAILABLE
    </span>
  );
}

function PoolDescriptionForm({
  initial,
  busy,
  onSubmit,
}: {
  initial: string;
  busy: boolean;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);
  useEffect(() => setValue(initial), [initial]);
  const dirty = value !== initial;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!dirty || busy) return;
        onSubmit(value);
      }}
      className="mt-1 space-y-2"
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Texto público que aparece arriba del pool en /oportunidades/pools/[slug]."
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!dirty || busy}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Guardar descripción
        </button>
      </div>
    </form>
  );
}
