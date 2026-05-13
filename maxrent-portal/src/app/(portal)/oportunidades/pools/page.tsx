// =============================================================================
// Oportunidades / Pools — Listado de pools (Producto 2)
// =============================================================================
// Muestra los pools publicados. Cada card linkea al detalle con la grilla de
// unidades reservables. En MVP esperamos un solo pool ("Propiedades San Miguel"),
// pero la página está diseñada para N pools.
// =============================================================================

import { PoolListFromApi } from "@/components/portal/pool-list-from-api";

export default function PoolsListPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl tracking-tight text-dark">
          Portafolios de propiedades
        </h1>
        <p className="mt-1 max-w-2xl text-gray-600">
          Carteras de propiedades ya arrendadas, con renta distribuida en todo el
          portafolio. Cada portafolio comparte un mismo cap rate; las unidades
          disponibles se reservan individualmente con el mismo flujo de
          evaluación + pago de reserva.
        </p>
      </div>

      <PoolListFromApi />
    </div>
  );
}
