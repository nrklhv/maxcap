"use client";

/**
 * Broker property catalog (ficha v3): demo data, filters, grid/list views.
 * Swap `properties` / `paymentsById` for API-backed values when Houm mapping exists.
 *
 * @domain broker
 * @see MOCK_CATALOG_PROPERTIES
 */

import { useMemo, useRef, useState } from "react";
import type {
  BrokerCatalogPaymentsByPropertyId,
  BrokerCatalogProperty,
  CatalogDormFilter,
  CatalogListSortColumn,
  CatalogPriceFilter,
  CatalogSortDropdown,
} from "@/lib/broker/catalog-types";
import {
  arriendoClp,
  capRate,
  ventaUf,
  CATALOG_UF_CLP,
} from "@/lib/broker/catalog-calculations";
import { MOCK_CATALOG_PAYMENTS, MOCK_CATALOG_PROPERTIES } from "@/lib/broker/mock-catalog-data";
import { CatalogPageHeader, CatalogUfBanner } from "./CatalogChrome";
import { CatalogToolbar } from "./CatalogToolbar";
import { PropertyCatalogCard } from "./PropertyCatalogCard";
import { PropertyCatalogListView } from "./PropertyCatalogListView";

function filterProperties(
  items: BrokerCatalogProperty[],
  dorm: CatalogDormFilter,
  comuna: string,
  precio: CatalogPriceFilter,
  ufRate: number
): BrokerCatalogProperty[] {
  return items.filter((p) => {
    if (dorm === "1" && p.dorm !== 1) return false;
    if (dorm === "2" && p.dorm < 2) return false;
    if (comuna !== "all" && p.comuna !== comuna) return false;
    if (precio !== "all") {
      const uf = ventaUf(p, ufRate);
      if (precio === "0-2000" && uf >= 2000) return false;
      if (precio === "2000-3000" && (uf < 2000 || uf >= 3000)) return false;
      if (precio === "3000-5000" && (uf < 3000 || uf >= 5000)) return false;
      if (precio === "5000+" && uf < 5000) return false;
    }
    return true;
  });
}

function sortProperties(
  list: BrokerCatalogProperty[],
  colSort: { col: CatalogListSortColumn | null; dir: "asc" | "desc" },
  sort: CatalogSortDropdown,
  ufRate: number
): BrokerCatalogProperty[] {
  const out = [...list];
  if (colSort.col) {
    const dir = colSort.dir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      switch (colSort.col) {
        case "comuna":
          return dir * a.comuna.localeCompare(b.comuna);
        case "m2":
          return dir * (a.m2 - b.m2);
        case "dorm":
          return dir * (a.dorm - b.dorm);
        case "arriendo":
          return dir * (arriendoClp(a, ufRate) - arriendoClp(b, ufRate));
        case "caprate":
          return dir * ((capRate(a, ufRate) ?? 0) - (capRate(b, ufRate) ?? 0));
        case "precio":
          return dir * (ventaUf(a, ufRate) - ventaUf(b, ufRate));
        default:
          return 0;
      }
    });
  } else if (sort === "precio-asc") {
    out.sort((a, b) => ventaUf(a, ufRate) - ventaUf(b, ufRate));
  } else if (sort === "precio-desc") {
    out.sort((a, b) => ventaUf(b, ufRate) - ventaUf(a, ufRate));
  } else if (sort === "caprate-desc") {
    out.sort((a, b) => (capRate(b, ufRate) ?? 0) - (capRate(a, ufRate) ?? 0));
  } else if (sort === "caprate-asc") {
    out.sort((a, b) => (capRate(a, ufRate) ?? 0) - (capRate(b, ufRate) ?? 0));
  }
  return out;
}

interface BrokerPropertyCatalogProps {
  properties?: BrokerCatalogProperty[];
  paymentsById?: BrokerCatalogPaymentsByPropertyId;
}

export function BrokerPropertyCatalog({
  properties = MOCK_CATALOG_PROPERTIES,
  paymentsById = MOCK_CATALOG_PAYMENTS,
}: BrokerPropertyCatalogProps) {
  const referenceDateRef = useRef<Date | null>(null);
  if (referenceDateRef.current == null) {
    referenceDateRef.current = new Date();
  }
  const referenceDate = referenceDateRef.current;

  const [dormFilter, setDormFilter] = useState<CatalogDormFilter>("all");
  const [comuna, setComuna] = useState("all");
  const [precio, setPrecio] = useState<CatalogPriceFilter>("all");
  const [sort, setSort] = useState<CatalogSortDropdown>("default");
  const [colSort, setColSort] = useState<{
    col: CatalogListSortColumn | null;
    dir: "asc" | "desc";
  }>({ col: null, dir: "asc" });
  const [view, setView] = useState<"grid" | "list">("grid");

  const comunas = useMemo(() => {
    const set = new Set(properties.map((p) => p.comuna));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [properties]);

  const ufDateLabel = useMemo(
    () =>
      referenceDate.toLocaleDateString("es-CL", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    [referenceDate]
  );

  const displayed = useMemo(() => {
    const filtered = filterProperties(properties, dormFilter, comuna, precio, CATALOG_UF_CLP);
    return sortProperties(filtered, colSort, sort, CATALOG_UF_CLP);
  }, [properties, dormFilter, comuna, precio, sort, colSort]);

  const sortIndicator = (col: CatalogListSortColumn) =>
    colSort.col === col ? (colSort.dir === "asc" ? " ↑" : " ↓") : "";

  const handleColumnSort = (col: CatalogListSortColumn) => {
    setColSort((prev) => {
      if (prev.col === col) {
        return { col, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { col, dir: col === "comuna" ? "asc" : "desc" };
    });
    setSort("default");
  };

  const handleSortDropdown = (v: CatalogSortDropdown) => {
    setSort(v);
    setColSort({ col: null, dir: "asc" });
  };

  const handleDormFilter = (v: CatalogDormFilter) => {
    setDormFilter(v);
    setColSort({ col: null, dir: "asc" });
    setSort("default");
  };

  return (
    <div className="-mx-4 overflow-hidden rounded-sm border border-[#e0dbd3] bg-[#f7f4ef] shadow-sm sm:-mx-0">
      <CatalogPageHeader />
      <CatalogUfBanner ufDateLabel={ufDateLabel} />
      <CatalogToolbar
        dormFilter={dormFilter}
        onDormFilter={handleDormFilter}
        comuna={comuna}
        onComuna={setComuna}
        comunas={comunas}
        precio={precio}
        onPrecio={setPrecio}
        sort={sort}
        onSort={handleSortDropdown}
        view={view}
        onView={setView}
        count={displayed.length}
        total={properties.length}
      />

      {view === "grid" ? (
        <div className="grid grid-cols-1 gap-5 px-6 py-6 sm:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] md:min-w-0 lg:grid-cols-[repeat(auto-fill,minmax(380px,1fr))] sm:px-10">
          {displayed.map((p, i) => (
            <div
              key={p.id}
              className="animate-catalog-fade-up"
              style={{ animationDelay: `${Math.min(i, 11) * 0.04}s` }}
            >
              <PropertyCatalogCard
                property={p}
                paymentsById={paymentsById}
                referenceDate={referenceDate}
              />
            </div>
          ))}
        </div>
      ) : (
        <PropertyCatalogListView
          rows={displayed}
          paymentsById={paymentsById}
          referenceDate={referenceDate}
          onColumnSort={handleColumnSort}
          sortIndicator={sortIndicator}
        />
      )}
    </div>
  );
}
