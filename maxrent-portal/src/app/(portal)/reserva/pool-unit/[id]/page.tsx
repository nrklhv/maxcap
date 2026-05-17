// =============================================================================
// Reserva / Pool Unit / [id] — Página de checkout para una unidad del pool
// =============================================================================
// El inversionista llega acá desde la grilla del detalle del pool. Acá ve la
// confirmación con el monto de reserva del pool y un botón que crea la
// `Reservation` y redirige a la pasarela de pago.
// =============================================================================

import { PoolUnitCheckout } from "@/components/portal/pool-unit-checkout";

type Props = {
  params: { id: string };
  searchParams: { from?: string };
};

export default function PoolUnitCheckoutPage({ params, searchParams }: Props) {
  const safeFrom =
    typeof searchParams.from === "string" && searchParams.from.startsWith("/")
      ? searchParams.from
      : "/oportunidades";
  return <PoolUnitCheckout unitId={params.id} backHref={safeFrom} />;
}
