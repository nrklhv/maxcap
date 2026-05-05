"use client";

// =============================================================================
// MarkPaidForm — form expandible para marcar payout como PAID
// =============================================================================
//
// Patrón "click para expandir" — primer click muestra textarea + botón
// Confirmar; segundo click envía. Misma UI sirve para Referrals
// (`endpoint = "/api/staff/referrals/<id>/mark-paid"`) y para BrokerLeads
// (`endpoint = "/api/staff/broker-leads/<id>/mark-paid"`). El parent decide
// cuál pasa.
//
// Refresca la página al éxito para que la fila se actualice (router.refresh).
// =============================================================================

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  endpoint: string;
  /** Texto que aparece en el placeholder del textarea, contextual al tipo. */
  placeholder?: string;
  /** Texto del botón colapsado. Default: "Marcar pagado". */
  buttonLabel?: string;
};

export function MarkPaidForm({
  endpoint,
  placeholder = "Detalle del pago — banco, referencia, fecha…",
  buttonLabel = "Marcar pagado",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-orange px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange/90"
      >
        {buttonLabel}
      </button>
    );
  }

  async function handleSubmit() {
    setError(null);
    if (!note.trim()) {
      setError("La nota es requerida");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Error al marcar como pagado");
        return;
      }
      router.refresh();
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-orange/30 bg-orange/5 p-2">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder={placeholder}
        className="w-full rounded border border-gray-300 px-2 py-1 text-xs text-gray-900 outline-none focus:border-orange"
        disabled={submitting}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setNote("");
            setError(null);
          }}
          className="rounded-md px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100"
          disabled={submitting}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="rounded-md bg-orange px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-orange/90 disabled:opacity-50"
          disabled={submitting}
        >
          {submitting ? "Guardando…" : "Confirmar pago"}
        </button>
      </div>
    </div>
  );
}
