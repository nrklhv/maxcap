// =============================================================================
// Landing local — accesos internos a portales (no es la vista final para clientes)
// =============================================================================

import type { Metadata } from "next";
import Link from "next/link";
import { Building2, LayoutDashboard, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: { absolute: "MaxRent — Accesos (dev)" },
  description: "Hub interno de enlaces a portales MaxRent",
};

export default function HomePage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4 py-16"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f3f4f6",
        padding: "4rem 1rem",
      }}
    >
      <div
        className="w-full max-w-md space-y-8"
        style={{ maxWidth: "28rem", width: "100%" }}
      >
        <header className="text-center space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-200 rounded-full px-3 py-1.5 inline-block">
            Desarrollo / equipo — no para clientes finales
          </p>
          <h1 className="text-3xl font-bold text-gray-900 font-serif tracking-tight">
            MaxRent
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            Enlaces directos a cada portal. Cuando conectemos{" "}
            <span className="whitespace-nowrap font-medium text-gray-800">www.maxrent.cl</span>, estos
            accesos se distribuirán desde la web pública; aquí solo agilizamos el trabajo local.
          </p>
        </header>

        <nav className="flex flex-col gap-3" aria-label="Portales">
          <Link
            href="/login?callbackUrl=/dashboard"
            className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm ring-1 ring-gray-100 hover:border-blue-300 hover:ring-blue-100 hover:shadow-md transition-all"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 group-hover:bg-blue-100">
              <LayoutDashboard className="h-6 w-6" aria-hidden />
            </span>
            <span className="text-left min-w-0">
              <span className="block text-base font-semibold text-gray-900">
                Inversionista
              </span>
              <span className="block text-xs text-gray-500 mt-0.5">
                Login → dashboard, perfil, evaluación, reservas
              </span>
            </span>
          </Link>

          <Link
            href="/brokers"
            className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm ring-1 ring-gray-100 hover:border-violet-300 hover:ring-violet-100 hover:shadow-md transition-all"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700 group-hover:bg-violet-100">
              <Building2 className="h-6 w-6" aria-hidden />
            </span>
            <span className="text-left min-w-0">
              <span className="block text-base font-semibold text-gray-900">Broker</span>
              <span className="block text-xs text-gray-500 mt-0.5">
                Landing canal broker → registro y solicitud
              </span>
            </span>
          </Link>

          <Link
            href="/staff/login"
            className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm ring-1 ring-gray-100 hover:border-gray-400 hover:shadow-md transition-all"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-800 group-hover:bg-gray-200">
              <Shield className="h-6 w-6" aria-hidden />
            </span>
            <span className="text-left min-w-0">
              <span className="block text-base font-semibold text-gray-900">Staff</span>
              <span className="block text-xs text-gray-500 mt-0.5">
                Login interno → inventario y aprobación brokers
              </span>
            </span>
          </Link>
        </nav>
      </div>
    </main>
  );
}
