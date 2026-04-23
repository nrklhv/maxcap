"use client";

import { useCallback, useEffect, useState } from "react";

type BrokerProfileBrief = {
  companyName: string;
  jobTitle: string;
  isIndependent: boolean;
  websiteUrl: string | null;
  linkedinUrl: string | null;
} | null;

type BrokerRow = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  brokerAccessStatus: string | null;
  brokerReviewedAt: string | null;
  brokerProfile: BrokerProfileBrief;
};

export function StaffBrokers() {
  const [items, setItems] = useState<BrokerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/brokers");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error");
        return;
      }
      setItems(data.brokers || []);
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(id: string, action: "approve" | "reject") {
    setError(null);
    try {
      const res = await fetch(`/api/staff/brokers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error");
        return;
      }
      await load();
    } catch {
      setError("Error de red");
    }
  }

  function statusBadge(status: string | null) {
    if (!status) return <span className="text-gray-400">—</span>;
    const styles: Record<string, string> = {
      PENDING: "bg-amber-100 text-amber-900 ring-1 ring-amber-200",
      APPROVED: "bg-green-100 text-green-800 ring-1 ring-green-200",
      REJECTED: "bg-red-100 text-red-800 ring-1 ring-red-200",
    };
    const cls = styles[status] || "bg-gray-100 text-gray-700 ring-1 ring-gray-200";
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
        {status}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-serif tracking-tight">Brokers</h1>
        <p className="mt-1 text-sm text-gray-600">
          Revisión de solicitudes de acceso al canal broker.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-red-600 rounded-lg border border-red-200 bg-red-50 px-3 py-2" role="alert">
          {error}
        </p>
      ) : null}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm ring-1 ring-gray-100">
        {loading ? (
          <p className="p-4 text-sm text-gray-500">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">
            No hay solicitudes broker (usuarios sin estado broker no aparecen).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50/90 text-left text-gray-600 border-b border-gray-100">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Email</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Nombre</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Empresa</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Cargo</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Indep.</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Web</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Alta</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-2 text-gray-900">{b.email}</td>
                    <td className="px-4 py-2 text-gray-700">{b.name || "—"}</td>
                    <td className="px-4 py-2 text-gray-700 max-w-[10rem] truncate" title={b.brokerProfile?.companyName}>
                      {b.brokerProfile?.companyName?.trim() || "—"}
                    </td>
                    <td className="px-4 py-2 text-gray-600 max-w-[8rem] truncate" title={b.brokerProfile?.jobTitle}>
                      {b.brokerProfile?.jobTitle?.trim() || "—"}
                    </td>
                    <td className="px-4 py-2 text-gray-600 text-xs">
                      {b.brokerProfile ? (b.brokerProfile.isIndependent ? "Sí" : "No") : "—"}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {b.brokerProfile?.websiteUrl ? (
                        <a
                          href={b.brokerProfile.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 hover:underline truncate max-w-[8rem] inline-block align-bottom"
                        >
                          Sitio
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">{statusBadge(b.brokerAccessStatus)}</td>
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                      {new Date(b.createdAt).toLocaleDateString("es-CL")}
                    </td>
                    <td className="px-4 py-2 flex flex-wrap gap-2 whitespace-nowrap">
                      {b.brokerAccessStatus === "PENDING" ? (
                        <>
                          <button
                            type="button"
                            className="inline-flex items-center rounded-md border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800 hover:bg-green-100 transition-colors"
                            onClick={() => patch(b.id, "approve")}
                          >
                            Aprobar
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-800 hover:bg-red-100 transition-colors"
                            onClick={() => patch(b.id, "reject")}
                          >
                            Rechazar
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">Sin acciones</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
