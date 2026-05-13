"use client";

/**
 * Página de confirmación / checkout para una unidad del pool.
 *
 * Flujo:
 *   1. GET `/api/portal/pool-units/[id]` → trae unit + pool + gate de evaluación
 *      + flag de si el inversionista ya tiene una reserva activa de la unidad.
 *   2. Si ya tiene reserva activa → muestra estado y link a `/reserva` (no
 *      permite duplicar).
 *   3. Si no, muestra resumen con monto de reserva y botón "Confirmar y pagar".
 *   4. Confirmar dispara POST `/api/reservations` con `poolUnitId`; con la
 *      respuesta dispara `/api/payments/checkout` y redirige a MP.
 *
 * @domain maxrent-portal
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, BedDouble, Bath, Ruler, ShieldCheck } from "lucide-react";
import type { PublicPoolDetail, PublicPoolUnit } from "@/lib/pool/public-types";
import type { ReserveBlockReason } from "@/lib/portal/investor-reservation-gate";
import { redirectToReservationCheckout } from "@/lib/portal/investor-reservation-checkout";

function formatUf(s: string): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n.toLocaleString("es-CL", { maximumFractionDigits: 0 });
}

function formatClp(s: string): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return `$${n.toLocaleString("es-CL", { maximumFractionDigits: 0 })}`;
}

function formatCapRate(s: string): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return `${(n * 100).toFixed(2).replace(".", ",")}%`;
}

export function PoolUnitCheckout({
  unitId,
  backHref,
}: {
  unitId: string;
  backHref: string;
}) {
  const [unit, setUnit] = useState<PublicPoolUnit | null>(null);
  const [pool, setPool] = useState<PublicPoolDetail | null>(null);
  const [canReserve, setCanReserve] = useState(false);
  const [reserveBlockReason, setReserveBlockReason] =
    useState<ReserveBlockReason | null>(null);
  const [investorActiveReservation, setInvestorActiveReservation] =
    useState<{ id: string; status: string } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/portal/pool-units/${unitId}`);
        const data = (await res.json()) as {
          error?: string;
          unit?: PublicPoolUnit;
          pool?: PublicPoolDetail;
          canReserve?: boolean;
          reserveBlockReason?: ReserveBlockReason | null;
          investorActiveReservation?: { id: string; status: string } | null;
        };
        if (cancelled) return;
        if (!res.ok || !data.unit || !data.pool) {
          setError(data.error || "No se pudo cargar la unidad");
          return;
        }
        setUnit(data.unit);
        setPool(data.pool);
        setCanReserve(data.canReserve === true);
        setReserveBlockReason(
          data.reserveBlockReason === "NO_EVAL" ||
            data.reserveBlockReason === "EVAL_NOT_COMPLETED" ||
            data.reserveBlockReason === "PENDING_STAFF_APPROVAL"
            ? data.reserveBlockReason
            : null
        );
        setInvestorActiveReservation(data.investorActiveReservation ?? null);
      } catch {
        if (!cancelled) setError("Error de red");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [unitId]);

  async function confirmAndPay() {
    if (!unit || !pool || !canReserve) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poolUnitId: unit.id }),
      });
      const data = (await res.json()) as {
        error?: string;
        reservation?: { id: string };
      };
      if (!res.ok) {
        setSubmitError(data.error || "No se pudo crear la reserva");
        return;
      }
      const reservationId = data.reservation?.id;
      if (!reservationId) {
        setSubmitError("Respuesta inválida del servidor");
        return;
      }
      const checkout = await redirectToReservationCheckout(reservationId);
      if (!checkout.ok) {
        setSubmitError(
          `${checkout.error}. Tu reserva quedó pendiente de pago — puedes intentar de nuevo desde Mis reservas.`
        );
      }
    } catch {
      setSubmitError("Error de red al crear la reserva");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !unit || !pool) {
    return (
      <div className="space-y-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <p className="text-sm text-red-600">{error || "No se pudo cargar la unidad"}</p>
      </div>
    );
  }

  const poolClosed = pool.status === "CLOSED" || !pool.acceptingReservations;
  const alreadyMine = Boolean(investorActiveReservation);

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al portafolio
      </Link>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
          {pool.name}
        </p>
        <h1 className="mt-1 font-serif text-2xl tracking-tight text-dark">
          Reservar unidad {unit.publicCode}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Confirma los datos públicos de la unidad y procede al pago de la reserva.
        </p>
      </div>

      {/* Estado: ya reservada por el propio usuario */}
      {alreadyMine ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span className="font-medium">Ya tienes una reserva activa de esta unidad.</span>{" "}
          Gestiona el pago y el seguimiento desde{" "}
          <Link href="/reserva" className="font-semibold underline">
            Mis reservas
          </Link>
          .
        </div>
      ) : null}

      {/* Bloqueos del pool o del gate */}
      {!alreadyMine && poolClosed ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          Este portafolio no acepta reservas en este momento.
        </div>
      ) : null}
      {!alreadyMine && !poolClosed && !canReserve ? (
        <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          {reserveBlockReason === "PENDING_STAFF_APPROVAL" ? (
            <>
              <span className="font-medium">Tu evaluación está lista.</span> El equipo debe
              habilitar reservas desde el panel interno; te avisaremos cuando esté lista.
            </>
          ) : (
            <>
              Para reservar esta unidad, completa tu{" "}
              <Link href="/evaluacion" className="font-semibold text-blue-700 underline">
                evaluación crediticia
              </Link>{" "}
              y espera la habilitación del equipo.
            </>
          )}
        </div>
      ) : null}

      {/* Resumen de la unidad */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50 px-5 py-4">
          <h2 className="text-base font-semibold tracking-tight text-gray-900">
            Resumen de la unidad
          </h2>
          <p className="mt-1 text-xs text-gray-600">{unit.label}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 px-5 py-4 text-sm sm:grid-cols-4">
          <Metric label="Comuna">{unit.comuna ?? "—"}</Metric>
          <Metric label="Precio (UF)">{formatUf(unit.priceUf)}</Metric>
          <Metric label="Renta/mes">
            ${Number(unit.monthlyRentClp).toLocaleString("es-CL", { maximumFractionDigits: 0 })}
          </Metric>
          <Metric label="Cap rate bruto">{formatCapRate(pool.capRateBruto)}</Metric>
        </div>
        <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 bg-gray-50/50 px-5 py-3 text-xs text-gray-600">
          {unit.dormitorios !== null ? (
            <span className="inline-flex items-center gap-1">
              <BedDouble className="h-3.5 w-3.5 text-gray-400" /> {unit.dormitorios} dorm
            </span>
          ) : null}
          {unit.banos !== null ? (
            <span className="inline-flex items-center gap-1">
              <Bath className="h-3.5 w-3.5 text-gray-400" /> {unit.banos} baño
              {unit.banos === 1 ? "" : "s"}
            </span>
          ) : null}
          {unit.superficieUtilM2 !== null ? (
            <span className="inline-flex items-center gap-1">
              <Ruler className="h-3.5 w-3.5 text-gray-400" /> {unit.superficieUtilM2} m² útil
              {unit.superficieTerrazaM2 !== null && unit.superficieTerrazaM2 > 0
                ? ` + ${unit.superficieTerrazaM2} m² terraza`
                : ""}
            </span>
          ) : null}
        </div>
      </div>

      {/* CTA */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">Monto de reserva</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
              {formatClp(pool.reservationFeeClp)} <span className="text-sm text-gray-500">CLP</span>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Imputable al precio total al momento de la compra.
            </div>
          </div>
          {alreadyMine ? (
            <Link
              href="/reserva"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Ir a Mis reservas
            </Link>
          ) : (
            <button
              type="button"
              disabled={submitting || !canReserve || poolClosed}
              onClick={() => void confirmAndPay()}
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              {submitting ? "Procesando…" : "Confirmar y pagar reserva"}
            </button>
          )}
        </div>
        {submitError ? (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {submitError}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 font-medium text-gray-900">{children}</div>
    </div>
  );
}
