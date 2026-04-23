"use client";

/**
 * Staff inventory: Houm sync, CSV import, unified catalog drafts queue (Houm + CSV), and table.
 * Reservas activas viven
 * en la ruta dedicada `/staff/reservas`.
 *
 * @domain maxrent-portal
 * @see staffPropertyListDisplay
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PropertyInventoryTable } from "@/components/broker/property-inventory-table";
import { SYNC_FROM_HOUM_MAX_IDS } from "@/lib/houm/sync-from-houm-request";

function parseListQueryInput(raw: string): Record<string, string> | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  try {
    const j = JSON.parse(t) as unknown;
    if (j && typeof j === "object" && !Array.isArray(j)) {
      const o: Record<string, string> = {};
      for (const [k, v] of Object.entries(j as Record<string, unknown>)) {
        if (v === null || v === undefined) continue;
        o[k] = String(v);
      }
      return Object.keys(o).length ? o : undefined;
    }
  } catch {
    /* formato línea clave=valor */
  }
  const out: Record<string, string> = {};
  for (const line of t.split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;
    const eq = s.indexOf("=");
    if (eq === -1) continue;
    const k = s.slice(0, eq).trim();
    const v = s.slice(eq + 1).trim();
    if (k) out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

function parseIdsInput(raw: string): string[] {
  return raw
    .split(/[\s,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

type StaffReservationSummary = {
  channel: "broker" | "investor";
  userId: string;
  email: string | null;
  name: string | null;
  reservedAt: string | null;
};

type Property = {
  id: string;
  title: string;
  status: string;
  visibleToBrokers: boolean;
  houmPropertyId: string | null;
  inventoryCode: string | null;
  metadata: unknown;
  staffReservationSummary?: StaffReservationSummary | null;
};

type CatalogDraftRow = {
  id: string;
  source: "HOUM" | "CSV";
  houmPropertyId: string | null;
  inventoryCode: string | null;
  title: string;
  status: string;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
  rejectionReason: string | null;
};

export function StaffProperties() {
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [syncingHoum, setSyncingHoum] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [catalogDrafts, setCatalogDrafts] = useState<CatalogDraftRow[]>([]);
  const [catalogDraftsLoading, setCatalogDraftsLoading] = useState(false);
  const [catalogDraftActionId, setCatalogDraftActionId] = useState<string | null>(null);
  const [houmSyncMode, setHoumSyncMode] = useState<"list" | "byIds">("list");
  const [houmListQueryText, setHoumListQueryText] = useState("");
  const [houmIdsText, setHoumIdsText] = useState("");

  const csvFileRef = useRef<HTMLInputElement>(null);
  const [importingCsv, setImportingCsv] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [importLineErrors, setImportLineErrors] = useState<{ line: number; message: string }[]>(
    []
  );

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

  const loadCatalogDrafts = useCallback(async () => {
    setCatalogDraftsLoading(true);
    try {
      const res = await fetch("/api/staff/properties/catalog-drafts?status=PENDING");
      const data = await res.json();
      if (!res.ok) return;
      setCatalogDrafts(Array.isArray(data.drafts) ? data.drafts : []);
    } catch {
      /* ignore */
    } finally {
      setCatalogDraftsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    void loadCatalogDrafts();
  }, [loadCatalogDrafts]);

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

  async function syncFromHoum() {
    setSyncingHoum(true);
    setSyncMessage(null);
    setError(null);
    try {
      const body: Record<string, unknown> = { mode: houmSyncMode };
      if (houmSyncMode === "list") {
        const listQuery = parseListQueryInput(houmListQueryText);
        if (listQuery) body.listQuery = listQuery;
      } else {
        const ids = parseIdsInput(houmIdsText);
        if (ids.length === 0) {
          setError("En modo por IDs ingresá al menos un id Houm (separados por coma, espacio o línea).");
          setSyncingHoum(false);
          return;
        }
        if (ids.length > SYNC_FROM_HOUM_MAX_IDS) {
          setError(`Máximo ${SYNC_FROM_HOUM_MAX_IDS} IDs por solicitud.`);
          setSyncingHoum(false);
          return;
        }
        body.houmIds = ids;
      }

      const res = await fetch("/api/staff/properties/sync-from-houm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo sincronizar");
        return;
      }
      const errCount = Array.isArray(data.errors) ? data.errors.length : 0;
      const parts: string[] = [
        `Modo ${data.mode === "byIds" ? "por IDs" : "listado"}`,
        `procesadas ${data.fetched ?? 0}`,
        `catálogo actualizado (ya publicadas) ${data.catalogPropertiesUpdated ?? 0}`,
        `borradores nuevos ${data.draftsCreated ?? 0}`,
        `borradores actualizados ${data.draftsUpdated ?? 0}`,
      ];
      if (typeof data.totalReceived === "number" && data.truncated) {
        parts.push(`recibidas en total ${data.totalReceived} (truncado al límite configurado)`);
      }
      if (data.warning && typeof data.warning === "string") {
        parts.push(data.warning);
      }
      if (errCount) parts.push(`${errCount} error(es) en filas`);
      setSyncMessage(parts.join(" · "));
      await load();
      await loadCatalogDrafts();
    } catch {
      setError("Error de red al sincronizar");
    } finally {
      setSyncingHoum(false);
    }
  }

  async function importCsvProperties() {
    const file = csvFileRef.current?.files?.[0];
    if (!file) {
      setError("Elegí un archivo CSV.");
      return;
    }
    setImportingCsv(true);
    setImportSummary(null);
    setImportLineErrors([]);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/staff/properties/import", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo importar");
        return;
      }
      setImportSummary(
        `Filas procesadas: ${data.processed ?? 0} · Creadas: ${data.created ?? 0} · Actualizadas: ${data.updated ?? 0}` +
          (data.ok ? "" : " (hubo errores en una o más filas)")
      );
      setImportLineErrors(Array.isArray(data.errors) ? data.errors : []);
      await load();
      await loadCatalogDrafts();
    } catch {
      setError("Error de red al importar");
    } finally {
      setImportingCsv(false);
      if (csvFileRef.current) csvFileRef.current.value = "";
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

  async function approveCatalogDraft(draftId: string) {
    setCatalogDraftActionId(draftId);
    setError(null);
    try {
      const res = await fetch(`/api/staff/properties/catalog-drafts/${draftId}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo aprobar el borrador");
        return;
      }
      await loadCatalogDrafts();
      await load();
    } catch {
      setError("Error de red al aprobar");
    } finally {
      setCatalogDraftActionId(null);
    }
  }

  async function rejectCatalogDraft(draftId: string) {
    const reason = window.prompt("Motivo del rechazo (opcional, se puede dejar vacío)") ?? "";
    setCatalogDraftActionId(draftId);
    setError(null);
    try {
      const res = await fetch(`/api/staff/properties/catalog-drafts/${draftId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo rechazar el borrador");
        return;
      }
      await loadCatalogDrafts();
    } catch {
      setError("Error de red al rechazar");
    } finally {
      setCatalogDraftActionId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-serif tracking-tight">
          Propiedades
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Cargá el inventario con <strong>import CSV</strong> o sincronización Houm. Las filas{" "}
          <strong>nuevas</strong> (id Houm o <span className="font-mono">inventory_code</span> que
          aún no está en inventario oficial) quedan en la <strong>cola de borradores</strong> hasta
          que las apruebes. Las filas CSV con código ya existente se actualizan en el acto. Después,
          los re-sync Houm actualizan el catálogo en sitio. Las propiedades ya en inventario entran
          como <strong>no publicadas</strong> al broker hasta <strong>Publicado: Sí</strong> en la
          tabla (y <strong>disponibles</strong>). Las reservas activas (brokers e inversionistas)
          están en{" "}
          <Link href="/staff/reservas" className="font-semibold text-blue-700 underline">
            Reservas
          </Link>
          .
        </p>
        {error ? (
          <p className="mt-3 text-sm text-red-600 rounded-lg border border-red-200 bg-red-50 px-3 py-2" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-6 lg:items-start">
        <div className="min-w-0 space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <h2 className="text-sm font-semibold text-gray-900 font-sans">Sincronizar desde Houm</h2>
        <p className="text-xs text-gray-600 leading-relaxed">
          El listado usa <span className="font-mono">GET</span> a{" "}
          <span className="font-mono">HOUM_API_BASE_URL</span> +{" "}
          <span className="font-mono">HOUM_PROPERTIES_LIST_PATH</span>. Podés anexar parámetros de
          consulta según el contrato de la API Houm. El servidor aplica un tope{" "}
          <span className="font-mono">HOUM_SYNC_MAX_ROWS</span> (por defecto 500) y avisa si se
          truncó. Modo por IDs requiere <span className="font-mono">HOUM_PROPERTY_BY_ID_PATH</span>{" "}
          con <span className="font-mono">{"{id}"}</span> — ver{" "}
          <span className="font-mono">docs/HOUM_CATALOG_METADATA.md</span>. Ids Houm{" "}
          <strong>nuevos</strong> generan filas en la cola de borradores debajo; las que ya están en
          inventario se actualizan al vuelo.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="houmSyncMode"
              checked={houmSyncMode === "list"}
              onChange={() => setHoumSyncMode("list")}
              className="text-blue-600"
            />
            <span>Listado (GET + query opcional)</span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="houmSyncMode"
              checked={houmSyncMode === "byIds"}
              onChange={() => setHoumSyncMode("byIds")}
              className="text-blue-600"
            />
            <span>Por IDs Houm (máx. {SYNC_FROM_HOUM_MAX_IDS})</span>
          </label>
        </div>
        {houmSyncMode === "list" ? (
          <label className="block">
            <span className="text-xs font-medium text-gray-700">
              Parámetros de consulta (opcional)
            </span>
            <textarea
              value={houmListQueryText}
              onChange={(e) => setHoumListQueryText(e.target.value)}
              rows={4}
              placeholder={`Ej. una línea por par clave=valor:\nlimit=100\nstatus=active\n\nO un objeto JSON:\n{"limit":"100","foo":"bar"}`}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-mono text-gray-800 placeholder:text-gray-400"
            />
          </label>
        ) : (
          <label className="block">
            <span className="text-xs font-medium text-gray-700">IDs Houm (uno o varios)</span>
            <textarea
              value={houmIdsText}
              onChange={(e) => setHoumIdsText(e.target.value)}
              rows={4}
              placeholder="Ej. 113670, 123201 o un id por línea"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-mono text-gray-800 placeholder:text-gray-400"
            />
          </label>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={syncingHoum}
            onClick={() => void syncFromHoum()}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {syncingHoum ? "Sincronizando…" : "Ejecutar sincronización"}
          </button>
          {syncMessage ? (
            <span className="text-sm text-gray-600 max-w-xl" role="status">
              {syncMessage}
            </span>
          ) : null}
        </div>
        </div>

        <div className="min-w-0 space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h2 className="text-sm font-semibold text-gray-900 font-sans">Importar CSV</h2>
        <p className="text-sm text-gray-600">
          Upsert por <span className="font-mono text-xs">inventory_code</span>. Delimitador coma,
          punto y coma o tab. Máx. 1000 filas de datos. Columnas planas (comuna, m², amenities,
          arriendo/venta, etc.) van a <span className="font-mono text-xs">metadata</span>;{" "}
          <span className="font-mono text-xs">payments_json</span> (opcional) es un array JSON de
          hasta 12 pagos → <span className="font-mono text-xs">metadata.payments</span>.{" "}
          <span className="font-mono text-xs">metadata_json</span> fusiona un objeto JSON extra al
          final.
        </p>
        <details className="text-sm text-gray-700 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2">
          <summary className="cursor-pointer font-medium text-gray-800 select-none">
            Columnas de la plantilla (orden)
          </summary>
          <p className="mt-2 text-xs font-mono text-gray-600 break-words leading-relaxed">
            inventory_code, title, status, visible_to_brokers, houm_property_id, comuna, dir,
            tipo, m2, dorm, ban, estac, bodega, gc, balcon, piscina, gym, mascotas, furnished, ac,
            fotos, arriendo, moneda, inicio, meses, venta, moneda_venta, lat, lng, payments_json,
            metadata_json
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Obligatorias: <span className="font-mono">inventory_code</span>,{" "}
            <span className="font-mono">title</span>. Detalle de tipos y merge en{" "}
            <span className="font-mono">docs/PROPERTY_INVENTORY_IMPORT.md</span>.
          </p>
        </details>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/api/staff/properties/import/template"
            download
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            Descargar plantilla CSV
          </a>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              ref={csvFileRef}
              type="file"
              accept=".csv,text/csv"
              className="max-w-[220px] text-sm text-gray-600 file:mr-2 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-800"
            />
          </label>
          <button
            type="button"
            disabled={importingCsv}
            onClick={() => void importCsvProperties()}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {importingCsv ? "Importando…" : "Importar archivo"}
          </button>
        </div>
        {importSummary ? (
          <p className="text-sm text-gray-800" role="status">
            {importSummary}
          </p>
        ) : null}
        {importLineErrors.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-900 mb-2">
              Errores por fila (línea = hoja Excel aprox.)
            </p>
            <ul className="max-h-40 overflow-y-auto text-xs text-amber-950 space-y-1 font-mono">
              {importLineErrors.map((e) => (
                <li key={`${e.line}-${e.message.slice(0, 40)}`}>
                  Línea {e.line}: {e.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        </div>
      </div>

      <div className="max-w-5xl space-y-3 rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-sm ring-1 ring-amber-100/80">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-amber-950 font-sans">
            Borradores pendientes (Houm + CSV)
          </h2>
          <button
            type="button"
            disabled={catalogDraftsLoading}
            onClick={() => void loadCatalogDrafts()}
            className="text-xs font-medium text-amber-900 underline-offset-2 hover:underline disabled:opacity-50"
          >
            {catalogDraftsLoading ? "Cargando…" : "Refrescar"}
          </button>
        </div>
        <p className="text-xs text-amber-950/80 leading-relaxed">
          Aprobá para crear la fila en inventario oficial. Origen <strong>Houm</strong>:{" "}
          <span className="font-mono">visibleToBrokers</span> según{" "}
          <span className="font-mono">HOUM_SYNC_DEFAULT_VISIBLE_TO_BROKERS</span>. Origen{" "}
          <strong>CSV</strong>: se usan las columnas <span className="font-mono">status</span> y{" "}
          <span className="font-mono">visible_to_brokers</span> del archivo. Rechazar deja registro;
          un sync o import posterior puede volver a poner la fila en pendiente con datos frescos.
        </p>
        {catalogDrafts.length === 0 && !catalogDraftsLoading ? (
          <p className="text-sm text-amber-900/70">No hay borradores pendientes.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-amber-200/60 bg-white">
            <table className="min-w-full text-left text-xs text-gray-800">
              <thead className="bg-amber-100/50 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-3 py-2">Origen</th>
                  <th className="px-3 py-2">Clave</th>
                  <th className="px-3 py-2">Título</th>
                  <th className="px-3 py-2">Actualizado</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {catalogDrafts.map((d) => (
                  <tr key={d.id}>
                    <td className="px-3 py-2 font-medium text-[11px]">
                      {d.source === "HOUM" ? "Houm" : "CSV"}
                    </td>
                    <td
                      className="px-3 py-2 font-mono text-[11px] max-w-[140px] truncate"
                      title={
                        d.source === "HOUM"
                          ? d.houmPropertyId ?? ""
                          : d.inventoryCode ?? ""
                      }
                    >
                      {d.source === "HOUM"
                        ? d.houmPropertyId ?? "—"
                        : d.inventoryCode ?? "—"}
                    </td>
                    <td className="px-3 py-2 max-w-[220px] truncate" title={d.title}>
                      {d.title}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-500">
                      {new Date(d.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap space-x-2">
                      <button
                        type="button"
                        disabled={catalogDraftActionId !== null}
                        onClick={() => void approveCatalogDraft(d.id)}
                        className="rounded-md bg-emerald-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                      >
                        {catalogDraftActionId === d.id ? "…" : "Aprobar"}
                      </button>
                      <button
                        type="button"
                        disabled={catalogDraftActionId !== null}
                        onClick={() => void rejectCatalogDraft(d.id)}
                        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="min-w-0 rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm ring-1 ring-gray-100">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/90">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
            Inventario
          </h2>
        </div>
        <PropertyInventoryTable
          variant="staff"
          rows={items}
          loading={loading}
          emptyLabel="No hay propiedades en la base. Usá import CSV o «Sincronizar desde Houm»."
          onVisibleChange={(id, visible) => updateRow(id, { visibleToBrokers: visible })}
          onStatusChange={(id, status) => updateRow(id, { status })}
          onDelete={removeRow}
        />
      </div>
    </div>
  );
}
