/**
 * Oportunidades de inversión.
 *
 * En el MVP solo ofrecemos Producto 2 (portafolios/pools), así que esta página
 * renderiza directo la grilla de pools. El catálogo de propiedades sueltas
 * (Producto 1, componente `<InvestorOpportunitiesFromApi />`) sigue existiendo
 * en el código y en la API pero no se expone — cuando volvamos a ofrecer
 * unidades individuales se agregan tabs (Pools | Propiedades sueltas).
 *
 * @domain portal
 * @see GET /api/portal/pools — listado consumido por <PoolListFromApi />
 */

import { PoolListFromApi } from "@/components/portal/pool-list-from-api";

export default function OportunidadesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl tracking-tight text-dark">
          Oportunidades de inversión
        </h1>
        <p className="mt-1 text-gray-600">
          Portafolios de propiedades arrendadas con renta distribuida.
        </p>
      </div>

      <PoolListFromApi />
    </div>
  );
}
