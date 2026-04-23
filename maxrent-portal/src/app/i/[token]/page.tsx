"use client";

/**
 * Public landing: validates invite token, stores it for post-login claim, redirects to login.
 *
 * @route /i/:token
 * @domain maxrent-portal / broker
 * @see broker-investor-invite-constants
 */

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BROKER_INVITE_SESSION_STORAGE_KEY } from "@/lib/broker/broker-investor-invite-constants";

export default function BrokerInviteLandingPage() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params?.token === "string" ? params.token : "";
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setMessage("Enlace inválido.");
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/public/broker-investor-invites/${encodeURIComponent(token)}`);
        if (cancelled) return;
        if (!res.ok) {
          setMessage("Este enlace no es válido o ya expiró.");
          return;
        }
        const data = (await res.json()) as { valid?: boolean };
        if (!data.valid) {
          setMessage("Este enlace no es válido o ya expiró.");
          return;
        }
        try {
          sessionStorage.setItem(BROKER_INVITE_SESSION_STORAGE_KEY, token);
        } catch {
          setMessage("Tu navegador bloqueó el almacenamiento local. Probá en otra ventana o desactivá el modo privado.");
          return;
        }
        router.replace(`/login?callbackUrl=${encodeURIComponent("/dashboard")}`);
      } catch {
        if (!cancelled) setMessage("No pudimos validar el enlace. Reintentá en unos segundos.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full rounded-xl border border-gray-200 bg-white p-8 shadow-sm text-center">
        <h1 className="font-serif text-xl font-semibold text-broker-navy">Invitación MaxRent</h1>
        {message ? (
          <p className="mt-4 text-sm text-gray-600">{message}</p>
        ) : (
          <p className="mt-4 text-sm text-gray-600">Validando tu invitación…</p>
        )}
        {message ? (
          <button
            type="button"
            className="mt-6 w-full rounded-lg bg-broker-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-broker-accent-hover"
            onClick={() => router.push("/login")}
          >
            Ir al inicio de sesión
          </button>
        ) : null}
      </div>
    </div>
  );
}
