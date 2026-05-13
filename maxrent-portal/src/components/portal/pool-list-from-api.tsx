"use client";

/**
 * Listado de pools publicados para el inversionista — Producto 2.
 *
 * Consume `GET /api/portal/pools` y renderiza una card por pool con métricas
 * agregadas (ocupación, total de unidades, cap rate). Click en la card lleva
 * a `/oportunidades/pools/[slug]`.
 *
 * @domain maxrent-portal
 * @see GET /api/portal/pools
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { Building2, TrendingUp } from "lucide-react";
import type { PublicPoolListItem } from "@/lib/pool/public-types";

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

function formatClp(s: string | null): string {
  if (s === null) return "—";
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return `$${n.toLocaleString("es-CL", { maximumFractionDigits: 0 })}`;
}

export function PoolListFromApi() {
  const [pools, setPools] = useState<PublicPoolListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/portal/pools");
        const data = (await res.json()) as {
          error?: string;
          pools?: PublicPoolListItem[];
        };
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

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (pools.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center shadow-sm">
        <p className="text-sm text-gray-600">
          No hay portafolios publicados en este momento.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {pools.map((p) => (
        <Link
          key={p.id}
          href={`/oportunidades/pools/${p.slug}`}
          className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:border-blue-200 hover:shadow"
        >
          <div className="border-b border-gray-100 bg-gray-50 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl tracking-tight text-dark group-hover:text-blue-700">
                  {p.name}
                </h2>
                {p.description ? (
                  <p className="mt-1 text-sm text-gray-600">{p.description}</p>
                ) : null}
              </div>
              {p.status === "CLOSED" ? (
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                  Cerrado
                </span>
              ) : !p.acceptingReservations ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                  En pausa
                </span>
              ) : (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">
                  Abierto
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 px-5 py-4 text-sm">
            <Metric icon={<Building2 className="h-4 w-4 text-gray-400" />} label="Unidades">
              {p.totalUnits}
            </Metric>
            <Metric icon={<TrendingUp className="h-4 w-4 text-gray-400" />} label="Cap rate bruto">
              {formatCapRate(p.capRateBruto)}
            </Metric>
            <Metric label="Ocupación">
              {formatPct(p.occupancyPct)}
            </Metric>
            <Metric label="Valor total (UF)">
              {formatUf(p.totalValueUf)}
            </Metric>
            <Metric label="Renta total mensual">
              {formatClp(p.totalMonthlyRentClp)}
            </Metric>
            <Metric label="Reserva por unidad">
              {formatClp(p.reservationFeeClp)}
            </Metric>
          </div>
        </Link>
      ))}
    </div>
  );
}

function Metric({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-gray-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-medium text-gray-900">{children}</div>
    </div>
  );
}
