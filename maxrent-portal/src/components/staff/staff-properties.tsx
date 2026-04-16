"use client";

import { useCallback, useEffect, useState } from "react";

type Property = {
  id: string;
  title: string;
  status: string;
  visibleToBrokers: boolean;
  metadata: unknown;
};

const STATUSES = ["AVAILABLE", "RESERVED", "SOLD", "ARCHIVED"] as const;

export function StaffProperties() {
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("AVAILABLE");
  const [visible, setVisible] = useState(true);
  const [metadataText, setMetadataText] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/staff/properties");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error");
        return;
      }
      setItems(data.properties || []);
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createProperty(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    let metadata: unknown = undefined;
    if (metadataText.trim()) {
      try {
        metadata = JSON.parse(metadataText);
      } catch {
        setError("Metadata debe ser JSON válido");
        setSaving(false);
        return;
      }
    }
    try {
      const res = await fetch("/api/staff/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          status,
          visibleToBrokers: visible,
          metadata,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo crear");
        return;
      }
      setTitle("");
      setMetadataText("");
      await load();
    } catch {
      setError("Error de red");
    } finally {
      setSaving(false);
    }
  }

  async function updateRow(id: string, patch: Record<string, unknown>) {
    setError(null);
    try {
      const res = await fetch(`/api/staff/properties/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al actualizar");
        return;
      }
      await load();
    } catch {
      setError("Error de red");
    }
  }

  async function removeRow(id: string) {
    if (!confirm("¿Eliminar esta propiedad?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/staff/properties/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error al eliminar");
        return;
      }
      await load();
    } catch {
      setError("Error de red");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-serif tracking-tight">
          Propiedades
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Inventario visible para brokers según cada registro.
        </p>
      </div>

      <form
        onSubmit={createProperty}
        className="rounded-xl border border-gray-200 bg-gray-50/80 p-6 shadow-sm space-y-4 max-w-2xl ring-1 ring-gray-100"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Nueva propiedad
        </h2>
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as (typeof STATUSES)[number])}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <label className="inline-flex items-center gap-2 mt-6 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={visible}
              onChange={(e) => setVisible(e.target.checked)}
            />
            Visible para brokers
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Metadata (JSON opcional)
          </label>
          <textarea
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
            rows={4}
            value={metadataText}
            onChange={(e) => setMetadataText(e.target.value)}
            placeholder='{"precioUf":120,"comuna":"San Miguel"}'
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Guardando…" : "Crear propiedad"}
        </button>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm ring-1 ring-gray-100">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/90">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
            Listado
          </h2>
        </div>
        {loading ? (
          <p className="p-4 text-sm text-gray-500">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">No hay propiedades.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50/90 text-left text-gray-600 border-b border-gray-100">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Título</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Visible</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2 font-medium text-gray-900">{p.title}</td>
                    <td className="px-4 py-2">
                      <select
                        className="rounded border border-gray-300 px-2 py-1 text-xs"
                        value={p.status}
                        onChange={(e) =>
                          updateRow(p.id, { status: e.target.value })
                        }
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={p.visibleToBrokers}
                        onChange={(e) =>
                          updateRow(p.id, { visibleToBrokers: e.target.checked })
                        }
                      />
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                        onClick={() => removeRow(p.id)}
                      >
                        Eliminar
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
