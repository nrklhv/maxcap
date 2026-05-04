// =============================================================================
// Oportunidades de inversión — Catálogo en dos secciones (reservas propias + disponibles)
// =============================================================================
// Mismo patrón que broker Oportunidades: GET /api/portal/catalog-properties y partido por
// `investorHasActiveReservation`. Reservar requiere evaluación + habilitación staff en API.
// =============================================================================

import Link from "next/link";
import { InvestorOpportunitiesFromApi } from "@/components/portal/investor-opportunities-from-api";

export default function OportunidadesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl tracking-tight text-dark">Oportunidades de inversión</h1>
        <p className="mt-1 max-w-2xl text-gray-600">
          Las propiedades que el equipo publicó al catálogo aparecen abajo en{" "}
          <strong className="font-medium text-gray-800">Disponibles</strong>. Cuando iniciás una
          reserva activa, la fila pasa a{" "}
          <strong className="font-medium text-gray-800">Mis reservas activas</strong>. Para pagos
          y seguimiento usá{" "}
          <Link href="/reserva" className="font-semibold text-blue-700 underline">
            Mis reservas
          </Link>
          .
        </p>
      </div>

      <InvestorOpportunitiesFromApi />
    </div>
  );
}
