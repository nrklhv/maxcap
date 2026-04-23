"use client";

/**
 * Dark catalog header and UF info banner (broker ficha v3 layout).
 *
 * @domain broker
 */

import { CATALOG_UF_CLP } from "@/lib/broker/catalog-calculations";

interface CatalogUfBannerProps {
  /** Shown as “UF hoy (dd Mmm yyyy)”. */
  ufDateLabel: string;
}

export function CatalogPageHeader() {
  return (
    <header className="flex items-center justify-between bg-[#1a1a1a] px-6 py-5 text-[#f7f4ef] sm:px-10">
      <div className="font-serif text-xl font-bold tracking-wide sm:text-2xl">
        MaxRent <span className="text-[#b8962e]">·</span> Broker
      </div>
      <div className="max-w-[220px] text-right text-[0.65rem] uppercase leading-relaxed tracking-widest text-[#aaa] sm:max-w-none">
        Propiedades para venta · Contrato LEASED activo
        <br />
        Chile · Catálogo demo
      </div>
    </header>
  );
}

export function CatalogUfBanner({ ufDateLabel }: CatalogUfBannerProps) {
  const clp = Math.round(CATALOG_UF_CLP).toLocaleString("es-CL");
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-[#d4b96a] bg-[#f0e4b8] px-6 py-2 text-[0.7rem] text-[#7a5c10] sm:px-10">
      <span>
        💱 UF hoy ({ufDateLabel}): <strong className="text-[#5a3d00]">${clp} CLP</strong>
      </span>
      <span className="hidden sm:inline">·</span>
      <span className="hidden sm:inline">
        Cap Rate = Arriendo anual / Valor venta · Dirección exacta disponible solo en mapa
      </span>
    </div>
  );
}
