"use client";

/**
 * Filters, sort dropdown, grid/list toggle, and result count for the broker catalog.
 *
 * @domain broker
 */

import { LayoutGrid, List } from "lucide-react";
import type {
  CatalogDormFilter,
  CatalogListSortColumn,
  CatalogPriceFilter,
  CatalogSortDropdown,
} from "@/lib/broker/catalog-types";

interface CatalogToolbarProps {
  dormFilter: CatalogDormFilter;
  onDormFilter: (v: CatalogDormFilter) => void;
  comuna: string;
  onComuna: (v: string) => void;
  comunas: string[];
  precio: CatalogPriceFilter;
  onPrecio: (v: CatalogPriceFilter) => void;
  sort: CatalogSortDropdown;
  onSort: (v: CatalogSortDropdown) => void;
  view: "grid" | "list";
  onView: (v: "grid" | "list") => void;
  count: number;
  total: number;
}

const pillBase =
  "rounded-sm border px-3 py-1 text-[0.68rem] transition-colors border-[#e0dbd3] text-[#4a4a4a] hover:border-[#b8962e] hover:text-[#b8962e]";
const pillActive = "border-[#1a1a1a] bg-[#1a1a1a] text-[#fdfcfa] hover:border-[#1a1a1a] hover:text-[#fdfcfa]";

export function CatalogToolbar({
  dormFilter,
  onDormFilter,
  comuna,
  onComuna,
  comunas,
  precio,
  onPrecio,
  sort,
  onSort,
  view,
  onView,
  count,
  total,
}: CatalogToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[#e0dbd3] bg-[#fdfcfa] px-6 py-3 sm:gap-2 sm:px-10">
      <span className="mr-1 text-[0.6rem] uppercase tracking-widest text-[#8a8a8a]">
        Filtrar
      </span>
      <button
        type="button"
        className={`${pillBase} ${dormFilter === "all" ? pillActive : ""}`}
        onClick={() => onDormFilter("all")}
      >
        Todos
      </button>
      <button
        type="button"
        className={`${pillBase} ${dormFilter === "1" ? pillActive : ""}`}
        onClick={() => onDormFilter("1")}
      >
        1 dorm
      </button>
      <button
        type="button"
        className={`${pillBase} ${dormFilter === "2" ? pillActive : ""}`}
        onClick={() => onDormFilter("2")}
      >
        2+ dorm
      </button>

      <div className="mx-1 hidden h-5 w-px bg-[#e0dbd3] sm:block" aria-hidden />

      <span className="ml-2 text-[0.6rem] uppercase tracking-widest text-[#8a8a8a] sm:ml-0">
        Comuna
      </span>
      <select
        className={`${pillBase} cursor-pointer appearance-none bg-transparent py-1 pr-7`}
        value={comuna}
        onChange={(e) => onComuna(e.target.value)}
      >
        <option value="all">Todas</option>
        {comunas.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <div className="mx-1 hidden h-5 w-px bg-[#e0dbd3] sm:block" aria-hidden />

      <span className="text-[0.6rem] uppercase tracking-widest text-[#8a8a8a]">
        Precio venta
      </span>
      <select
        className={`${pillBase} cursor-pointer appearance-none bg-transparent py-1 pr-7`}
        value={precio}
        onChange={(e) => onPrecio(e.target.value as CatalogPriceFilter)}
      >
        <option value="all">Cualquier precio</option>
        <option value="0-2000">Hasta 2.000 UF</option>
        <option value="2000-3000">2.000–3.000 UF</option>
        <option value="3000-5000">3.000–5.000 UF</option>
        <option value="5000+">Más de 5.000 UF</option>
      </select>

      <div className="mx-1 hidden h-5 w-px bg-[#e0dbd3] sm:block" aria-hidden />

      <span className="text-[0.6rem] uppercase tracking-widest text-[#8a8a8a]">Ordenar</span>
      <select
        className={`${pillBase} cursor-pointer appearance-none bg-transparent py-1 pr-7`}
        value={sort}
        onChange={(e) => onSort(e.target.value as CatalogSortDropdown)}
      >
        <option value="default">Por defecto</option>
        <option value="precio-asc">Precio ↑</option>
        <option value="precio-desc">Precio ↓</option>
        <option value="caprate-desc">Cap Rate ↓</option>
        <option value="caprate-asc">Cap Rate ↑</option>
      </select>

      <div className="mx-1 hidden h-5 w-px bg-[#e0dbd3] sm:block" aria-hidden />

      <span className="text-[0.6rem] uppercase tracking-widest text-[#8a8a8a]">Ver</span>
      <div className="flex gap-1">
        <button
          type="button"
          title="Tarjetas"
          className={`flex h-7 w-[30px] items-center justify-center rounded-sm border border-[#e0dbd3] text-[#8a8a8a] transition-colors ${
            view === "grid" ? "border-[#1a1a1a] bg-[#1a1a1a] text-[#fdfcfa]" : "hover:border-[#b8962e]"
          }`}
          onClick={() => onView("grid")}
        >
          <LayoutGrid className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <button
          type="button"
          title="Lista"
          className={`flex h-7 w-[30px] items-center justify-center rounded-sm border border-[#e0dbd3] text-[#8a8a8a] transition-colors ${
            view === "list" ? "border-[#1a1a1a] bg-[#1a1a1a] text-[#fdfcfa]" : "hover:border-[#b8962e]"
          }`}
          onClick={() => onView("list")}
        >
          <List className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>

      <span className="ml-auto text-[0.65rem] text-[#8a8a8a]">
        Mostrando <strong className="text-[#1a1a1a]">{count}</strong> de {total}
      </span>
    </div>
  );
}

export function CatalogListSortHeader({
  onColumnSort,
  sortIndicator,
}: {
  onColumnSort: (col: CatalogListSortColumn) => void;
  sortIndicator: (col: CatalogListSortColumn) => string;
}) {
  const th =
    "cursor-pointer select-none whitespace-nowrap px-2 py-2 text-[0.58rem] font-normal uppercase tracking-widest hover:text-[#f0e4b8]";
  return (
    <div className="grid grid-cols-[minmax(140px,2.5fr)_0.8fr_0.8fr_0.8fr_0.8fr_1fr_1.2fr_80px] gap-0 rounded-t-sm bg-[#1a1a1a] px-4 py-0 text-[#f7f4ef]">
      <button type="button" className={`${th} text-left`} onClick={() => onColumnSort("comuna")}>
        Propiedad <span className="opacity-60">{sortIndicator("comuna")}</span>
      </button>
      <button type="button" className={`${th} text-left`} onClick={() => onColumnSort("m2")}>
        m² <span className="opacity-60">{sortIndicator("m2")}</span>
      </button>
      <button type="button" className={`${th} text-left`} onClick={() => onColumnSort("dorm")}>
        Dorm <span className="opacity-60">{sortIndicator("dorm")}</span>
      </button>
      <button type="button" className={`${th} text-left`} onClick={() => onColumnSort("arriendo")}>
        Arriendo <span className="opacity-60">{sortIndicator("arriendo")}</span>
      </button>
      <button type="button" className={`${th} text-left`} onClick={() => onColumnSort("caprate")}>
        Cap Rate <span className="opacity-60">{sortIndicator("caprate")}</span>
      </button>
      <button type="button" className={`${th} text-left`} onClick={() => onColumnSort("precio")}>
        Precio venta <span className="opacity-60">{sortIndicator("precio")}</span>
      </button>
      <div className="flex items-center px-2 py-2 text-[0.58rem] uppercase tracking-widest">
        Pagos 12m
      </div>
      <div className="px-2 py-2" />
    </div>
  );
}
