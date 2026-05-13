// =============================================================================
// Staff → Pools — Listado de portafolios (Producto 2)
// =============================================================================
// Vista interna. El import del Excel se sigue corriendo por CLI (scripts/
// import-lab-pool.ts); esta página permite ver pools existentes, pausar/cerrar
// y entrar al detalle por unidad.
// =============================================================================

import { StaffPoolsList } from "@/components/staff/staff-pools-list";

export default function StaffPoolsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-gray-900">
          Portafolios (Pool)
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600">
          Cada portafolio agrupa N unidades con cap rate común y monto de reserva fijo. Las
          unidades se importan desde Excel con el script CLI{" "}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">
            scripts/import-lab-pool.ts
          </code>{" "}
          (idempotente, ver{" "}
          <a
            href="/docs/POOL_PRODUCTO.md"
            className="font-semibold text-blue-700 underline"
          >
            docs
          </a>
          ).
        </p>
      </div>

      <StaffPoolsList />
    </div>
  );
}
