"use client";

/**
 * Lists sponsored investors and their active reservations for the approved broker UI.
 *
 * @domain maxrent-portal / broker
 * @see GET /api/broker/sponsored-investors
 * @see GET /api/broker/sponsored-reservations
 */

import { useCallback, useEffect, useState } from "react";

type InvestorRow = { id: string; email: string; name: string | null; createdAt: string };

type ReservationRow = {
  id: string;
  status: string;
  propertyId: string;
  propertyName: string | null;
  amount: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  paidAt: string | null;
  investor: { id: string; email: string; name: string | null };
};

export function BrokerSponsoredInvestorsPanel() {
  const [investors, setInvestors] = useState<InvestorRow[]>([]);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [invRes, resRes] = await Promise.all([
        fetch("/api/broker/sponsored-investors"),
        fetch("/api/broker/sponsored-reservations?activeOnly=true"),
      ]);
      const invText = await invRes.text();
      const resText = await resRes.text();
      let invData: { investors?: InvestorRow[]; error?: unknown };
      let resData: { reservations?: ReservationRow[]; error?: unknown };
      try {
        invData = invText.trim() ? (JSON.parse(invText) as typeof invData) : {};
      } catch {
        setError(
          !invRes.ok && invRes.status >= 500
            ? "Respuesta inválida al cargar inversionistas (¿migraciones Prisma aplicadas?)."
            : "Respuesta inválida del servidor."
        );
        return;
      }
      try {
        resData = resText.trim() ? (JSON.parse(resText) as typeof resData) : {};
      } catch {
        setError(
          !resRes.ok && resRes.status >= 500
            ? "Respuesta inválida al cargar reservas (¿migraciones Prisma aplicadas?)."
            : "Respuesta inválida del servidor."
        );
        return;
      }
      if (!invRes.ok) {
        setError(
          typeof invData.error === "string" && invData.error.trim()
            ? invData.error
            : "No se pudo cargar inversionistas"
        );
        return;
      }
      if (!resRes.ok) {
        setError(
          typeof resData.error === "string" && resData.error.trim()
            ? resData.error
            : "No se pudo cargar reservas"
        );
        return;
      }
      setInvestors(invData.investors || []);
      setReservations(resData.reservations || []);
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-broker-muted">Cargando…</p>;
  }
  if (error) {
    return (
      <p className="text-sm text-red-600 rounded-lg border border-red-200 bg-red-50 px-3 py-2" role="alert">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 bg-broker-accent-soft px-4 py-3">
          <h2 className="text-sm font-semibold text-broker-navy uppercase tracking-wide">
            Inversionistas vinculados
          </h2>
          <p className="mt-1 text-xs text-broker-muted">
            Asignación por staff MaxRent. Si la lista está vacía, aún no hay cuentas asociadas a tu corretaje.
          </p>
        </div>
        {investors.length === 0 ? (
          <p className="p-4 text-sm text-broker-muted">No hay inversionistas vinculados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50/90 text-left text-gray-600 border-b border-gray-100">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Email</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Nombre</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Alta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {investors.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-2 text-gray-900">{u.email}</td>
                    <td className="px-4 py-2 text-gray-700">{u.name?.trim() || "—"}</td>
                    <td className="px-4 py-2 text-xs text-gray-500 tabular-nums whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleString("es-CL")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 bg-broker-accent-soft px-4 py-3">
          <h2 className="text-sm font-semibold text-broker-navy uppercase tracking-wide">
            Reservas activas de inversionistas
          </h2>
          <p className="mt-1 text-xs text-broker-muted">
            Estados: pendiente de pago, en proceso de pago, pagada o confirmada.
          </p>
        </div>
        {reservations.length === 0 ? (
          <p className="p-4 text-sm text-broker-muted">No hay reservas activas de inversionistas vinculados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50/90 text-left text-gray-600 border-b border-gray-100">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Inversionista</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Propiedad</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Monto</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Actualizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reservations.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-2">
                      <div className="text-gray-900">{r.investor.email}</div>
                      <div className="text-xs text-gray-500">{r.investor.name?.trim() || "—"}</div>
                    </td>
                    <td className="px-4 py-2 text-gray-800">
                      <div className="max-w-xs truncate">{r.propertyName?.trim() || r.propertyId}</div>
                    </td>
                    <td className="px-4 py-2 text-xs font-medium text-gray-800">{r.status}</td>
                    <td className="px-4 py-2 tabular-nums text-gray-800">
                      {r.currency} {Number(r.amount).toLocaleString("es-CL")}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500 tabular-nums whitespace-nowrap">
                      {new Date(r.updatedAt).toLocaleString("es-CL")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
