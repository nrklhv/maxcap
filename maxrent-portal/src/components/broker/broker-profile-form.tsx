"use client";

/**
 * Commercial broker profile form: GET/PATCH `/api/broker/profile`.
 * Editable regardless of broker access status (broker-only data, portal broker only).
 *
 * @domain maxrent-portal / broker
 * @see GET|PATCH /api/broker/profile
 */

import { useCallback, useEffect, useState } from "react";

export type BrokerProfileFormValues = {
  companyName: string;
  jobTitle: string;
  isIndependent: boolean;
  websiteUrl: string;
  linkedinUrl: string;
  pitch: string;
};

const emptyValues: BrokerProfileFormValues = {
  companyName: "",
  jobTitle: "",
  isIndependent: false,
  websiteUrl: "",
  linkedinUrl: "",
  pitch: "",
};

export function BrokerProfileForm() {
  const [values, setValues] = useState<BrokerProfileFormValues>(emptyValues);
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/broker/profile");
      const text = await res.text();
      let data: { profile?: unknown; complete?: unknown; error?: unknown };
      try {
        data = text.trim() ? (JSON.parse(text) as { profile?: unknown; complete?: unknown; error?: unknown }) : {};
      } catch {
        setError(
          !res.ok && res.status >= 500
            ? "El servidor respondió con error y sin JSON válido. Revisá la consola del servidor."
            : "Respuesta inválida del servidor."
        );
        return;
      }
      if (!res.ok) {
        const msg =
          typeof data.error === "string" && data.error.trim()
            ? data.error
            : !text.trim() && res.status >= 500
              ? "Error del servidor (respuesta vacía)."
              : "Error al cargar";
        setError(msg);
        return;
      }
      const p = data.profile as {
        companyName: string;
        jobTitle: string;
        isIndependent: boolean;
        websiteUrl: string | null;
        linkedinUrl: string | null;
        pitch: string | null;
      };
      setValues({
        companyName: p.companyName ?? "",
        jobTitle: p.jobTitle ?? "",
        isIndependent: Boolean(p.isIndependent),
        websiteUrl: p.websiteUrl ?? "",
        linkedinUrl: p.linkedinUrl ?? "",
        pitch: p.pitch ?? "",
      });
      setComplete(Boolean(data.complete));
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedOk(false);
    try {
      const res = await fetch("/api/broker/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: values.companyName,
          jobTitle: values.jobTitle,
          isIndependent: values.isIndependent,
          websiteUrl: values.websiteUrl || undefined,
          linkedinUrl: values.linkedinUrl || undefined,
          pitch: values.pitch || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "No se pudo guardar");
        return;
      }
      setSavedOk(true);
      const p = data.profile as BrokerProfileFormValues & {
        websiteUrl: string | null;
        linkedinUrl: string | null;
        pitch: string | null;
      };
      setValues({
        companyName: p.companyName,
        jobTitle: p.jobTitle,
        isIndependent: p.isIndependent,
        websiteUrl: p.websiteUrl ?? "",
        linkedinUrl: p.linkedinUrl ?? "",
        pitch: p.pitch ?? "",
      });
      const check = await fetch("/api/broker/profile");
      const checkData = await check.json();
      if (check.ok) setComplete(Boolean(checkData.complete));
    } catch {
      setError("Error de red");
    } finally {
      setSaving(false);
    }
  }

  const disabled = saving || loading;

  if (loading) {
    return <p className="text-sm text-broker-muted">Cargando perfil…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <p className="text-sm text-red-600 rounded-lg border border-red-200 bg-red-50 px-3 py-2" role="alert">
          {error}
        </p>
      ) : null}
      {savedOk ? (
        <p className="text-sm text-green-800 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
          Cambios guardados.
        </p>
      ) : null}

      <p className="text-sm text-broker-muted">
        Datos solo del canal broker. Completá o actualizá cuando quieras; podés guardar y volver más tarde.
      </p>

      {complete ? (
        <p className="text-sm font-medium text-green-800">
          Perfil listo. Si aún no enviaste la solicitud, podés ir a <strong>Enviar solicitud</strong> en el menú
          lateral.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-1">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Nombre de la empresa / razón social
          </span>
          <input
            type="text"
            required
            disabled={disabled}
            value={values.companyName}
            onChange={(e) => setValues((v) => ({ ...v, companyName: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cargo</span>
          <input
            type="text"
            required
            disabled={disabled}
            value={values.jobTitle}
            onChange={(e) => setValues((v) => ({ ...v, jobTitle: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50"
          />
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            disabled={disabled}
            checked={values.isIndependent}
            onChange={(e) => setValues((v) => ({ ...v, isIndependent: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-300 text-broker-accent focus:ring-broker-accent"
          />
          <span className="text-sm text-gray-800">Trabajo de forma independiente (no dependo de una empresa)</span>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Sitio web (opcional)
          </span>
          <input
            type="text"
            inputMode="url"
            autoComplete="url"
            placeholder="www.empresa.cl"
            disabled={disabled}
            value={values.websiteUrl}
            onChange={(e) => setValues((v) => ({ ...v, websiteUrl: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50"
          />
          <span className="mt-1 block text-xs text-gray-500">
            No hace falta escribir https://; si falta, se completa al guardar.
          </span>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            LinkedIn (opcional)
          </span>
          <input
            type="text"
            inputMode="url"
            autoComplete="url"
            placeholder="linkedin.com/in/tu-perfil o www.linkedin.com/…"
            disabled={disabled}
            value={values.linkedinUrl}
            onChange={(e) => setValues((v) => ({ ...v, linkedinUrl: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50"
          />
          <span className="mt-1 block text-xs text-gray-500">
            Misma regla que el sitio web: podés omitir https://.
          </span>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Comentario breve (opcional)
          </span>
          <textarea
            rows={4}
            maxLength={4000}
            disabled={disabled}
            value={values.pitch}
            onChange={(e) => setValues((v) => ({ ...v, pitch: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-50"
            placeholder="Experiencia, zona de cobertura, tipo de cartera…"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="inline-flex justify-center rounded-lg bg-broker-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-broker-accent-hover disabled:opacity-50"
      >
        {saving ? "Guardando…" : "Guardar perfil"}
      </button>
    </form>
  );
}
