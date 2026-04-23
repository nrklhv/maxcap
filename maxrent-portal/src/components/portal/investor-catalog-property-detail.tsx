"use client";

/**
 * Ficha de una propiedad del catálogo inversionista; reserva vía `POST /api/reservations`
 * y redirección a checkout si `canReserve` (evaluación COMPLETED + aprobación staff).
 *
 * @domain portal
 * @see GET /api/portal/catalog-properties/[id]
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReserveBlockReason } from "@/lib/portal/investor-reservation-gate";
import { redirectToReservationCheckout } from "@/lib/portal/investor-reservation-checkout";

type PropertyPayload = {
  id: string;
  title: string;
  status: string;
  metadata: unknown;
  inventoryCode?: string | null;
  houmPropertyId?: string | null;
};

export function InvestorCatalogPropertyDetail({ propertyId }: { propertyId: string }) {
  const [property, setProperty] = useState<PropertyPayload | null>(null);
  const [evaluationId, setEvaluationId] = useState<string | null>(null);
  const [canReserve, setCanReserve] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reserving, setReserving] = useState(false);
  const [reserveError, setReserveError] = useState<string | null>(null);
  const [reserveBlockReason, setReserveBlockReason] = useState<ReserveBlockReason | null>(null);
  const [investorHasActiveReservation, setInvestorHasActiveReservation] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/portal/catalog-properties/${propertyId}`);
        const data = (await res.json()) as {
          error?: string;
          property?: PropertyPayload;
          evaluationId?: string | null;
          canReserve?: boolean;
          reserveBlockReason?: ReserveBlockReason | null;
          investorHasActiveReservation?: boolean;
        };
        if (!res.ok) {
          if (!cancelled) setError(data.error || "No encontrada");
          return;
        }
        if (!cancelled) {
          setProperty(data.property ?? null);
          setEvaluationId(typeof data.evaluationId === "string" ? data.evaluationId : null);
          setCanReserve(data.canReserve === true);
          setReserveBlockReason(
            data.reserveBlockReason === "NO_EVAL" ||
              data.reserveBlockReason === "EVAL_NOT_COMPLETED" ||
              data.reserveBlockReason === "PENDING_STAFF_APPROVAL"
              ? data.reserveBlockReason
              : null
          );
          setReserveError(null);
          setInvestorHasActiveReservation(data.investorHasActiveReservation === true);
        }
      } catch {
        if (!cancelled) setError("Error de red");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  async function reserve() {
    if (!evaluationId || !property || !canReserve) return;
    setReserveError(null);
    setReserving(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: property.id,
          evaluationId,
          propertyName: property.title,
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
          `${checkout.error} Podés intentar de nuevo (la reserva quedó pendiente de pago).`
        );
      }
    } catch {
      setReserveError("Error de red al reservar");
    } finally {
      setReserving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-600">Cargando…</p>;
  }
  if (error || !property) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">{error || "No encontrada"}</p>
        <Link
          href="/oportunidades"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
        >
          Volver a Oportunidades de inversión
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Link
          href="/oportunidades"
          className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline"
        >
          ← Oportunidades de inversión
        </Link>
        <Link
          href="/reserva"
          className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 hover:underline"
        >
          Mis reservas
        </Link>
      </div>

      {!canReserve && property.status === "AVAILABLE" ? (
        <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          {reserveBlockReason === "PENDING_STAFF_APPROVAL" ? (
            <>
              <span className="font-medium">Tu evaluación está lista.</span> El equipo debe
              habilitar reservas desde el panel interno; te avisaremos o podés consultar con un
              asesor.
            </>
          ) : (
            <>
              Para reservar esta propiedad, completá tu{" "}
              <Link href="/evaluacion" className="font-semibold text-blue-700 underline">
                evaluación crediticia
              </Link>
              .
            </>
          )}
        </div>
      ) : null}

      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{property.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {property.status}
            </span>
            {property.status === "AVAILABLE" && investorHasActiveReservation ? (
              <span
                className="rounded-lg border border-blue-200 bg-blue-50/90 px-4 py-2 text-sm font-semibold text-blue-800"
                title="Ya tenés una reserva activa para esta propiedad"
              >
                Reservado
              </span>
            ) : property.status === "AVAILABLE" && canReserve ? (
              <button
                type="button"
                disabled={reserving}
                onClick={() => void reserve()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {reserving ? "Reservando…" : "Reservar"}
              </button>
            ) : null}
          </div>
        </div>
        {reserveError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {reserveError}
          </p>
        ) : null}
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
          {property.inventoryCode ? (
            <div>
              <dt className="inline text-gray-500">Código inventario: </dt>
              <dd className="inline font-mono font-medium text-gray-900">{property.inventoryCode}</dd>
            </div>
          ) : null}
          {property.houmPropertyId ? (
            <div>
              <dt className="inline text-gray-500">Houm: </dt>
              <dd className="inline font-mono text-gray-900">{property.houmPropertyId}</dd>
            </div>
          ) : null}
        </dl>
        {property.metadata != null ? (
          <pre className="overflow-x-auto rounded-lg border border-gray-100 bg-gray-50 p-4 text-xs text-gray-800">
            {JSON.stringify(property.metadata, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-gray-500">Sin detalle adicional cargado.</p>
        )}
      </div>
    </div>
  );
}
