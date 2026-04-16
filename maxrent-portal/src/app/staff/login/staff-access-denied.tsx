"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

export function StaffAccessDenied({
  email,
  reason,
}: {
  email?: string | null;
  reason?: "forbidden" | "oauth";
}) {
  const title =
    reason === "oauth"
      ? "No se pudo completar el inicio de sesión"
      : "Sin acceso staff";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-md rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm space-y-4">
        <h1 className="text-lg font-semibold text-amber-950">{title}</h1>
        <p className="text-sm text-amber-900 leading-relaxed">
          {reason === "oauth" ? (
            <>
              Hubo un error con Google u otro proveedor (cuenta no enlazada, acceso
              cancelado o configuración). Cierra sesión o prueba otra cuenta.
            </>
          ) : (
            <>
              La sesión activa
              {email ? (
                <>
                  {" "}
                  (<span className="font-mono text-xs">{email}</span>)
                </>
              ) : null}{" "}
              no tiene rol <strong>SUPER_ADMIN</strong> en la base de datos. Pide que
              actualicen tu usuario o usa{" "}
              <code className="text-xs bg-white/80 px-1 rounded">STAFF_SUPER_ADMIN_EMAILS</code>{" "}
              en <code className="text-xs bg-white/80 px-1 rounded">.env.local</code>.
            </>
          )}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/staff/login" })}
            className="inline-flex justify-center rounded-lg bg-amber-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-950"
          >
            Cerrar sesión e intentar de nuevo
          </button>
          <Link
            href="/dashboard"
            className="inline-flex justify-center rounded-lg border border-amber-300 bg-white px-4 py-2.5 text-sm font-medium text-amber-950 hover:bg-amber-100/80"
          >
            Ir al portal inversionista
          </Link>
        </div>
      </div>
    </main>
  );
}
