"use client";

/**
 * Approved broker UI: create invite links; table shows link status vs investor progress (two columns).
 *
 * @domain maxrent-portal / broker
 * @see GET/POST /api/broker/investor-invites
 */

import { useCallback, useEffect, useState } from "react";

type InviteRow = {
  id: string;
  inviteUrl: string;
  inviteeEmail: string | null;
  linkStatus: "PENDING" | "COMPLETED" | "EXPIRED";
  linkStatusLabel: string;
  investorProgressLabel: string;
  createdAt: string;
  expiresAt: string;
};

export function BrokerInvitarPanel() {
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteeEmail, setInviteeEmail] = useState("");
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/broker/investor-invites");
      const text = await res.text();
      let data: { invites?: InviteRow[]; error?: string };
      try {
        data = text.trim() ? (JSON.parse(text) as typeof data) : {};
      } catch {
        setError("Respuesta inválida del servidor.");
        return;
      }
      if (!res.ok) {
        setError(data.error || "No se pudo cargar la lista.");
        return;
      }
      setInvites(data.invites || []);
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setCopyFeedback(null);
    try {
      const res = await fetch("/api/broker/investor-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteeEmail: inviteeEmail.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        invite?: { inviteUrl: string };
      };
      if (!res.ok) {
        setError(data.error || "No se pudo crear la invitación.");
        return;
      }
      if (data.invite?.inviteUrl) {
        setCopyFeedback("Enlace generado. Podés copiarlo desde la tabla.");
        setInviteeEmail("");
      }
      await load();
    } catch {
      setError("Error de red");
    } finally {
      setCreating(false);
    }
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopyFeedback("Copiado al portapapeles.");
      setTimeout(() => setCopyFeedback(null), 2500);
    } catch {
      setCopyFeedback("No se pudo copiar. Copiá manualmente el enlace.");
    }
  }

  if (loading) {
    return <p className="text-sm text-broker-muted">Cargando…</p>;
  }

  return (
    <div className="space-y-8">
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      {copyFeedback ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {copyFeedback}
        </div>
      ) : null}

      <form onSubmit={handleCreate} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-broker-navy font-serif">Nueva invitación</h2>
        <p className="text-sm text-broker-muted">
          Generá un enlace único para que un inversionista se registre o inicie sesión y quede asociado a tu
          corretaje. Podés anotar un email de referencia (opcional) para identificar la invitación en la lista.
        </p>
        <div>
          <label htmlFor="invitee-email" className="block text-sm font-medium text-gray-700 mb-1">
            Email del inversionista (opcional)
          </label>
          <input
            id="invitee-email"
            type="email"
            autoComplete="off"
            placeholder="ejemplo@correo.com"
            value={inviteeEmail}
            onChange={(e) => setInviteeEmail(e.target.value)}
            className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-broker-accent focus:border-broker-accent outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={creating}
          className="rounded-lg bg-broker-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-broker-accent-hover disabled:opacity-60"
        >
          {creating ? "Generando…" : "Generar enlace"}
        </button>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-broker-navy font-serif">Invitaciones</h2>
          <p className="mt-1 text-sm text-broker-muted">
            <strong>Invitación</strong>: si el enlace sigue pendiente, fue usado o expiró.{" "}
            <strong>Progreso</strong>: dónde va el inversionista una vez vinculado (perfil, evaluación Floid,
            aprobación staff).
          </p>
        </div>
        {invites.length === 0 ? (
          <p className="p-6 text-sm text-broker-muted">Todavía no generaste invitaciones.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-gray-600">
                  <th className="px-4 py-3 font-medium">Creada</th>
                  <th className="px-4 py-3 font-medium">Email ref.</th>
                  <th className="px-4 py-3 font-medium">Invitación</th>
                  <th className="px-4 py-3 font-medium">Progreso</th>
                  <th className="px-4 py-3 font-medium">Vence</th>
                  <th className="px-4 py-3 font-medium">Enlace</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/80">
                    <td className="px-4 py-3 text-gray-800 whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleString("es-CL", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.inviteeEmail || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          row.linkStatus === "COMPLETED"
                            ? "text-emerald-700 font-medium"
                            : row.linkStatus === "EXPIRED"
                              ? "text-gray-500"
                              : "text-amber-800 font-medium"
                        }
                      >
                        {row.linkStatusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-800 max-w-[14rem] sm:max-w-xs">
                      <span className="leading-snug">{row.investorProgressLabel}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(row.expiresAt).toLocaleDateString("es-CL")}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void copyUrl(row.inviteUrl)}
                        className="text-broker-accent font-medium hover:underline text-left"
                      >
                        Copiar enlace
                      </button>
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
