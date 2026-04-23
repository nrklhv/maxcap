"use client";

/**
 * Investor «Oportunidades de inversión»: dos bloques como broker Oportunidades —
 * reservas activas arriba (`investorHasActiveReservation`) y catálogo disponible abajo.
 *
 * @domain maxrent-portal
 * @see GET /api/portal/catalog-properties
 * @see PropertyInventoryTable
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  PropertyInventoryTable,
  type PropertyInventoryRow,
} from "@/components/broker/property-inventory-table";
import type { ReserveBlockReason } from "@/lib/portal/investor-reservation-gate";

type ApiPropertyRow = {
  id: string;
  title: string;
  status: string;
  metadata: unknown;
  houmPropertyId?: string | null;
  inventoryCode?: string | null;
  investorHasActiveReservation?: boolean;
};

function mapApiRows(list: ApiPropertyRow[]): PropertyInventoryRow[] {
  return list.map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    metadata: p.metadata,
    houmPropertyId: p.houmPropertyId ?? null,
    inventoryCode: p.inventoryCode ?? null,
    investorHasActiveReservation: p.investorHasActiveReservation === true,
  }));
}

export function InvestorOpportunitiesFromApi() {
  const [rows, setRows] = useState<PropertyInventoryRow[]>([]);
  const [evaluationId, setEvaluationId] = useState<string | null>(null);
  const [canReserve, setCanReserve] = useState(false);
  const [reserveBlockReason, setReserveBlockReason] = useState<ReserveBlockReason | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const catalogRes = await fetch("/api/portal/catalog-properties");
      const catalogData = (await catalogRes.json()) as {
        error?: string;
        properties?: ApiPropertyRow[];
        canReserve?: boolean;
        evaluationId?: string | null;
        reserveBlockReason?: ReserveBlockReason | null;
      };
      if (!catalogRes.ok) {
        setError(catalogData.error || "No se pudo cargar");
        return;
      }
      setRows(mapApiRows((catalogData.properties ?? []) as ApiPropertyRow[]));
      setCanReserve(catalogData.canReserve === true);
      setEvaluationId(typeof catalogData.evaluationId === "string" ? catalogData.evaluationId : null);
      setReserveBlockReason(
        catalogData.reserveBlockReason === "NO_EVAL" ||
          catalogData.reserveBlockReason === "EVAL_NOT_COMPLETED" ||
          catalogData.reserveBlockReason === "PENDING_STAFF_APPROVAL"
          ? catalogData.reserveBlockReason
          : null
      );
    } catch {
      setError("Error de red");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

  const myReservedRows = rows.filter((r) => r.investorHasActiveReservation === true);
  const availableRows = rows.filter((r) => !r.investorHasActiveReservation);

  return (
    <div className="space-y-6">
      {!canReserve ? (
        <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          {reserveBlockReason === "PENDING_STAFF_APPROVAL" ? (
            <>
              <span className="font-medium">Reservas bloqueadas por ahora.</span> Tu evaluación está
              lista; el equipo debe habilitar reservas desde el panel interno. Tus reservas pagadas
              las ves en{" "}
              <Link href="/reserva" className="font-semibold text-blue-700 underline">
                Mis reservas
              </Link>
              .
            </>
          ) : (
            <>
              <span className="font-medium">Reservas bloqueadas por ahora.</span> Completá tu{" "}
              <Link href="/evaluacion" className="font-semibold text-blue-700 underline">
                evaluación crediticia
              </Link>{" "}
              y esperá la habilitación del equipo para el botón Reservar. Tus reservas pagadas las
              ves en{" "}
              <Link href="/reserva" className="font-semibold text-blue-700 underline">
                Mis reservas
              </Link>
              .
            </>
          )}
        </div>
      ) : null}

      <div className="space-y-8">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gray-50 px-4 py-4">
            <h2 className="text-lg font-semibold tracking-tight text-gray-900">Mis reservas activas</h2>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              Propiedades con tu reserva inversionista activa; siguen publicadas y las gestionás
              desde{" "}
              <Link href="/reserva" className="font-semibold text-blue-700 underline">
                Mis reservas
              </Link>
              .
            </p>
          </div>
          <PropertyInventoryTable
            variant="investor"
            brokerListMode="myReserved"
            rows={myReservedRows}
            loading={false}
            emptyLabel="No tenés reservas activas en este momento."
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gray-50 px-4 py-4">
            <h2 className="text-lg font-semibold tracking-tight text-gray-900">Disponibles</h2>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              Publicadas por el equipo y disponibles para iniciar una reserva desde la grilla (si
              tenés evaluación habilitada).
            </p>
          </div>
          <PropertyInventoryTable
            variant="investor"
            brokerListMode="available"
            rows={availableRows}
            loading={false}
            emptyLabel="No hay oportunidades publicadas en este momento."
            investorEvaluationId={evaluationId}
            investorCanReserve={canReserve}
            onReserveComplete={() => void load({ silent: true })}
          />
        </div>
      </div>
    </div>
  );
}
