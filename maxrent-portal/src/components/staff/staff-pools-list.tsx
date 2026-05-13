"use client";

/**
 * Staff → Pools: tabla de pools con métricas + link al detalle de cada uno.
 *
 * @domain maxrent-portal / staff
 * @see GET /api/staff/pools
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

type StaffPoolRow = {
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
function clp(s: string | null): string {
  if (s === null) return "—";
  const n = Number(s);
  return Number.isFinite(n)
    ? `$${n.toLocaleString("es-CL", { maximumFractionDigits: 0 })}`
    : s;
}

export function StaffPoolsList() {
  const [pools, setPools] = useState<StaffPoolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/staff/pools");
        const data = (await res.json()) as { error?: string; pools?: StaffPoolRow[] };
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "No se pudo cargar");
          return;
        }
        setPools(data.pools ?? []);
      } catch {
        if (!cancelled) setError("Error de red");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }
  if (pools.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm">
        <p className="text-sm text-gray-600">
          No hay portafolios cargados. Corre el script de import (
          <code className="rounded bg-gray-100 px-1 font-mono text-xs">
            scripts/import-lab-pool.ts
          </code>
          ) con un slug nuevo para crear uno.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-100 text-sm">
        <thead className="bg-gray-50/80 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3 font-medium">Pool</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium text-right">Unidades</th>
            <th className="px-4 py-3 font-medium text-right">Cap rate</th>
            <th className="px-4 py-3 font-medium text-right">Ocupación</th>
            <th className="px-4 py-3 font-medium text-right">Valor UF</th>
            <th className="px-4 py-3 font-medium text-right">Renta/mes</th>
            <th className="px-4 py-3 font-medium text-right">Reserva</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {pools.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50/60">
              <td className="px-4 py-3">
                <Link
                  href={`/staff/pools/${p.slug}`}
                  className="font-medium text-gray-900 hover:text-blue-700"
                >
                  {p.name}
                </Link>
                <div className="text-xs text-gray-500">{p.slug}</div>
              </td>
              <td className="px-4 py-3">
                <StatusBadge
                  status={p.status}
                  acceptingReservations={p.acceptingReservations}
                />
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{p.totalUnits}</td>
              <td className="px-4 py-3 text-right tabular-nums">{capRate(p.capRateBruto)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{pct(p.occupancyPct)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{uf(p.totalValueUf)}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {clp(p.totalMonthlyRentClp)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{clp(p.reservationFeeClp)}</td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/staff/pools/${p.slug}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Detalle <ChevronRight className="h-3 w-3" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({
  status,
  acceptingReservations,
}: {
  status: StaffPoolRow["status"];
  acceptingReservations: boolean;
}) {
  if (status === "CLOSED") {
    return (
      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
        Cerrado
      </span>
    );
  }
  if (status === "DRAFT") {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
        Borrador
      </span>
    );
  }
  if (!acceptingReservations) {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
        En pausa
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">
      Abierto
    </span>
  );
}
