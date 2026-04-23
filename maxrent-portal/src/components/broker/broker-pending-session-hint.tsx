"use client";

/**
 * Lets a broker pending approval refresh the NextAuth JWT after staff approves them,
 * without forcing a full sign-out (see SETUP.md).
 *
 * @domain maxrent-portal / broker
 * @route /broker/pending
 */

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function BrokerPendingSessionHint() {
  const { update } = useSession();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleRefresh() {
    setBusy(true);
    setMsg(null);
    try {
      await update();
      router.refresh();
      setMsg(
        "Listo. Si ya fuiste aprobado, deberías ver «Oportunidades de Inversión» en el menú. Si sigue pendiente, esperá unos minutos o escribinos."
      );
    } catch {
      setMsg("No se pudo actualizar. Probá cerrar sesión y volver a entrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
      <p>
        Cuando MaxRent apruebe tu cuenta, a veces hace falta <strong>refrescar la sesión</strong> para que el
        menú muestre Oportunidades e Inversionistas. Podés usar el botón o cerrar sesión y volver a entrar.
      </p>
      <button
        type="button"
        onClick={() => void handleRefresh()}
        disabled={busy}
        className="inline-flex rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
      >
        {busy ? "Actualizando…" : "Actualizar sesión"}
      </button>
      {msg ? (
        <p className="text-xs leading-relaxed text-gray-600" role="status">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
