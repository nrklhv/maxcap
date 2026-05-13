// =============================================================================
// Oportunidades de inversión — Catálogo en dos secciones (reservas propias + disponibles)
// =============================================================================
// Mismo patrón que broker Oportunidades: GET /api/portal/catalog-properties y partido por
// `investorHasActiveReservation`. Reservar requiere evaluación + habilitación staff en API.
// =============================================================================

import Link from "next/link";
import { ArrowRight, Layers } from "lucide-react";
import { InvestorOpportunitiesFromApi } from "@/components/portal/investor-opportunities-from-api";

export default function OportunidadesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl tracking-tight text-dark">Oportunidades de inversión</h1>
        <p className="mt-1 max-w-2xl text-gray-600">
          Las propiedades que el equipo publicó al catálogo aparecen abajo en{" "}
          <strong className="font-medium text-gray-800">Disponibles</strong>. Cuando inicias una
          reserva activa, la fila pasa a{" "}
          <strong className="font-medium text-gray-800">Mis reservas activas</strong>. Para pagos
          y seguimiento usa{" "}
          <Link href="/reserva" className="font-semibold text-blue-700 underline">
            Mis reservas
          </Link>
          .
        </p>
      </div>

      {/* Discovery card del Producto 2 — Pools */}
      <Link
        href="/oportunidades/pools"
        className="group flex items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white px-5 py-4 shadow-sm transition hover:border-blue-200 hover:shadow"
      >
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-blue-600/10 p-2.5 text-blue-700">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-blue-700">
              Nuevo · Portafolios de propiedades
            </div>
            <div className="mt-0.5 font-medium text-gray-900">
              Invierte en una cartera arrendada con renta distribuida
            </div>
            <div className="mt-0.5 text-xs text-gray-600">
              Reserva unidades individuales dentro de un portafolio con cap rate común.
            </div>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 shrink-0 text-blue-600 transition group-hover:translate-x-0.5" />
      </Link>

      <InvestorOpportunitiesFromApi />
    </div>
  );
}
