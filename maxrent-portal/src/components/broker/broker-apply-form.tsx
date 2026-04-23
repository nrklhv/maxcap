"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export function BrokerApplyForm() {
  const { update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

  const loadProfileGate = useCallback(async () => {
    try {
      const res = await fetch("/api/broker/profile");
      const data = await res.json();
      if (res.ok) {
        setProfileComplete(Boolean(data.complete));
      } else {
        setProfileComplete(false);
      }
    } catch {
      setProfileComplete(false);
    }
  }, []);

  useEffect(() => {
    void loadProfileGate();
  }, [loadProfileGate]);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/broker/apply", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "No se pudo enviar");
        return;
      }
      await update();
      router.push("/broker/pending");
      router.refresh();
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = profileComplete === true;

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {profileComplete === false ? (
        <p className="text-sm text-amber-900 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          Completá y guardá tu <strong>Perfil comercial</strong> en el menú lateral antes de enviar la solicitud.
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={loading || !canSubmit}
        className="inline-flex w-full justify-center rounded-lg bg-broker-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-broker-accent-hover disabled:opacity-50 sm:w-auto"
      >
        {loading ? "Enviando…" : "Enviar solicitud"}
      </button>
    </div>
  );
}
