"use client";

/**
 * Detalle de un pool + grilla de unidades reservables para el inversionista.
 *
 * Consume `GET /api/portal/pools/[slug]`. Cada fila puede estar en uno de tres
 * estados de venta (`saleStatus`):
 *   - AVAILABLE → muestra botón Reservar (sujeto al gate de evaluación).
 *   - RESERVED  → muestra "Reservada" (otro inversionista o el propio usuario).
 *   - SOLD      → muestra "Vendida".
 *
 * El estado de **ocupación** (`ocupacion`) es información del arriendo actual y
 * se muestra como tag, pero NO bloquea reservar (las vacantes también son
 * reservables: la renta del portafolio se distribuye entre todas las unidades).
 *
 * @domain maxrent-portal
 * @see GET /api/portal/pools/[slug]
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  CheckCircle2,
  Lock,
  Ruler,
} from "lucide-react";
import type {
  PublicPoolDetail,
  PublicPoolUnit,
} from "@/lib/pool/public-types";
import type { ReserveBlockReason } from "@/lib/portal/investor-reservation-gate";

type UnitWithFlag = PublicPoolUnit & { investorHasActiveReservation: boolean };

function formatPct(v: number | null): string {
  if (v === null) return "—";
  return `${v.toFixed(1)}%`;
}

function formatCapRate(s: string): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return `${(n * 100).toFixed(2).replace(".", ",")}%`;
}

function formatUf(s: string | null): string {
  if (s === null) return "—";
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n.toLocaleString("es-CL", { maximumFractionDigits: 0 });
}

function formatUfFromString(s: string): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n.toLocaleString("es-CL", { maximumFractionDigits: 0 });
}

function formatClp(s: string | null): string {
  if (s === null) return "—";
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return `$${n.toLocaleString("es-CL", { maximumFractionDigits: 0 })}`;
}

const OCUPACION_LABEL: Record<PublicPoolUnit["ocupacion"], string> = {
  ARRENDADO: "Arrendada",
  VACANTE: "Vacante",
  POR_DESOCUPARSE: "Por desocuparse",
  AVISO_SALIDA: "Aviso de salida",
  AVISADO_PARA_DESOCUPAR: "Aviso de salida",
  PUBLICADA: "Publicada",
};

const OCUPACION_CLASS: Record<PublicPoolUnit["ocupacion"], string> = {
  ARRENDADO: "bg-emerald-50 text-emerald-800 border-emerald-100",
  VACANTE: "bg-amber-50 text-amber-800 border-amber-100",
  POR_DESOCUPARSE: "bg-orange-50 text-orange-800 border-orange-100",
  AVISO_SALIDA: "bg-orange-50 text-orange-800 border-orange-100",
  AVISADO_PARA_DESOCUPAR: "bg-orange-50 text-orange-800 border-orange-100",
  PUBLICADA: "bg-blue-50 text-blue-800 border-blue-100",
};

export function PoolDetailFromApi({ slug }: { slug: string }) {
  const [pool, setPool] = useState<PublicPoolDetail | null>(null);
  const [units, setUnits] = useState<UnitWithFlag[]>([]);
  const [canReserve, setCanReserve] = useState(false);
  const [reserveBlockReason, setReserveBlockReason] =
    useState<ReserveBlockReason | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/pools/${slug}`);
      const data = (await res.json()) as {
        error?: string;
        pool?: PublicPoolDetail;
        units?: UnitWithFlag[];
        canReserve?: boolean;
        reserveBlockReason?: ReserveBlockReason | null;
      };
      if (!res.ok || !data.pool) {
        setError(data.error || "No se pudo cargar el portafolio");
        return;
      }
      setPool(data.pool);
      setUnits(data.units ?? []);
      setCanReserve(data.canReserve === true);
      setReserveBlockReason(
        data.reserveBlockReason === "NO_EVAL" ||
          data.reserveBlockReason === "EVAL_NOT_COMPLETED" ||
          data.reserveBlockReason === "PENDING_STAFF_APPROVAL"
          ? data.reserveBlockReason
          : null
      );
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

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
          href="/oportunidades/pools"
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a portafolios
        </Link>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  const poolClosed = pool.status === "CLOSED" || !pool.acceptingReservations;
  const availableUnits = units.filter((u) => u.saleStatus === "AVAILABLE").length;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/oportunidades/pools"
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a portafolios
        </Link>
        <h1 className="mt-3 font-serif text-2xl tracking-tight text-dark">
          {pool.name}
        </h1>
        {pool.description ? (
          <p className="mt-1 max-w-2xl text-gray-600">{pool.description}</p>
        ) : null}
      </div>

      {/* Resumen agregado */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Unidades">{pool.totalUnits}</SummaryCard>
        <SummaryCard label="Cap rate bruto">{formatCapRate(pool.capRateBruto)}</SummaryCard>
        <SummaryCard label="Ocupación">{formatPct(pool.occupancyPct)}</SummaryCard>
        <SummaryCard label="Valor total (UF)">{formatUf(pool.totalValueUf)}</SummaryCard>
      </div>

      {/* Bloqueos */}
      {poolClosed ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          <span className="font-medium">Este portafolio no acepta reservas en este momento.</span>{" "}
          Puedes revisar las unidades pero no podrás reservarlas.
        </div>
      ) : !canReserve ? (
        <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          {reserveBlockReason === "PENDING_STAFF_APPROVAL" ? (
            <>
              <span className="font-medium">Reservas bloqueadas por ahora.</span> Tu evaluación
              está lista; el equipo debe habilitar reservas desde el panel interno.
            </>
          ) : (
            <>
              <span className="font-medium">Reservas bloqueadas por ahora.</span> Completa tu{" "}
              <Link href="/evaluacion" className="font-semibold text-blue-700 underline">
                evaluación crediticia
              </Link>{" "}
              y espera la habilitación del equipo.
            </>
          )}
        </div>
      ) : null}

      {/* Aclaración importante: las vacantes también son reservables */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-blue-900">
        Todas las unidades del portafolio son reservables, incluyendo las que figuran como{" "}
        <span className="font-medium">vacantes</span>: la renta se distribuye entre todo el
        portafolio.
      </div>

      {/* Grilla de unidades */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-4">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">
            Unidades del portafolio
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            {availableUnits} disponibles de {pool.totalUnits} unidades. Reserva por unidad: {" "}
            <span className="font-medium">{formatClp(pool.reservationFeeClp)}</span>.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50/50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Unidad</th>
                <th className="px-4 py-3 font-medium">Comuna</th>
                <th className="px-4 py-3 font-medium">Detalle</th>
                <th className="px-4 py-3 font-medium">Ocupación</th>
                <th className="px-4 py-3 font-medium text-right">Precio (UF)</th>
                <th className="px-4 py-3 font-medium text-right">Renta/mes</th>
                <th className="px-4 py-3 font-medium text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {units.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                    Sin unidades en este portafolio.
                  </td>
                </tr>
              ) : (
                units.map((u) => (
                  <UnitRow
                    key={u.id}
                    unit={u}
                    poolSlug={pool.slug}
                    canReserve={canReserve && !poolClosed}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-gray-900">{children}</div>
    </div>
  );
}

function UnitRow({
  unit: u,
  poolSlug,
  canReserve,
}: {
  unit: UnitWithFlag;
  poolSlug: string;
  canReserve: boolean;
}) {
  const isAvailable = u.saleStatus === "AVAILABLE";

  return (
    <tr className="hover:bg-gray-50/60">
      <td className="px-4 py-3">
        <div className="font-medium text-gray-900">{u.publicCode}</div>
        <div className="text-xs text-gray-500">{u.label}</div>
      </td>
      <td className="px-4 py-3 text-gray-700">{u.comuna ?? "—"}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
          {u.dormitorios !== null ? (
            <span className="inline-flex items-center gap-1">
              <BedDouble className="h-3.5 w-3.5 text-gray-400" /> {u.dormitorios}D
            </span>
          ) : null}
          {u.banos !== null ? (
            <span className="inline-flex items-center gap-1">
              <Bath className="h-3.5 w-3.5 text-gray-400" /> {u.banos}B
            </span>
          ) : null}
          {u.superficieUtilM2 !== null ? (
            <span className="inline-flex items-center gap-1">
              <Ruler className="h-3.5 w-3.5 text-gray-400" /> {u.superficieUtilM2} m²
              {u.superficieTerrazaM2 !== null && u.superficieTerrazaM2 > 0
                ? ` + ${u.superficieTerrazaM2} m² terraza`
                : ""}
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${OCUPACION_CLASS[u.ocupacion]}`}
        >
          {OCUPACION_LABEL[u.ocupacion]}
        </span>
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-gray-900">
        {formatUfFromString(u.priceUf)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-gray-700">
        ${Number(u.monthlyRentClp).toLocaleString("es-CL", { maximumFractionDigits: 0 })}
      </td>
      <td className="px-4 py-3 text-right">
        <UnitAction unit={u} poolSlug={poolSlug} canReserve={canReserve && isAvailable} />
      </td>
    </tr>
  );
}

function UnitAction({
  unit: u,
  poolSlug,
  canReserve,
}: {
  unit: UnitWithFlag;
  poolSlug: string;
  canReserve: boolean;
}) {
  if (u.investorHasActiveReservation) {
    return (
      <Link
        href="/reserva"
        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
      >
        <CheckCircle2 className="h-3.5 w-3.5" /> Tu reserva
      </Link>
    );
  }
  if (u.saleStatus === "SOLD") {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
        <Lock className="h-3.5 w-3.5" /> Vendida
      </span>
    );
  }
  if (u.saleStatus === "RESERVED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
        <Lock className="h-3.5 w-3.5" /> Reservada
      </span>
    );
  }
  // AVAILABLE
  if (!canReserve) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500"
        title="Completa tu evaluación y la habilitación del equipo para reservar"
      >
        <Building2 className="h-3.5 w-3.5" /> Reservar
      </button>
    );
  }
  return (
    <Link
      href={`/reserva/pool-unit/${u.id}?from=${encodeURIComponent(`/oportunidades/pools/${poolSlug}`)}`}
      className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
    >
      <Building2 className="h-3.5 w-3.5" /> Reservar
    </Link>
  );
}
