"use client";

/**
 * Sortable table-style list view for the broker catalog (ficha v3).
 *
 * @domain broker
 */

import type {
  BrokerCatalogPaymentsByPropertyId,
  BrokerCatalogProperty,
  CatalogListSortColumn,
} from "@/lib/broker/catalog-types";
import {
  CATALOG_UF_CLP,
  capRate,
  capRateBand,
  formatArriendoListCell,
  formatPct,
  formatVentaDisplay,
  paymentDotsList,
} from "@/lib/broker/catalog-calculations";
import { capRateTextClass, paymentDotListClasses } from "./payment-dot-styles";
import { CatalogListSortHeader } from "./CatalogToolbar";

interface PropertyCatalogListViewProps {
  rows: BrokerCatalogProperty[];
  paymentsById: BrokerCatalogPaymentsByPropertyId;
  referenceDate: Date;
  onColumnSort: (col: CatalogListSortColumn) => void;
  sortIndicator: (col: CatalogListSortColumn) => string;
}

export function PropertyCatalogListView({
  rows,
  paymentsById,
  referenceDate,
  onColumnSort,
  sortIndicator,
}: PropertyCatalogListViewProps) {
  return (
    <div className="overflow-x-auto px-6 pb-16 pt-4 sm:px-10">
      <div className="min-w-[920px]">
        <CatalogListSortHeader onColumnSort={onColumnSort} sortIndicator={sortIndicator} />
        <div>
          {rows.map((p) => {
            const cr = capRate(p, CATALOG_UF_CLP);
            const band = capRateBand(cr);
            const crStr = cr != null ? formatPct(cr) : "N/D";
            const mapHref = `https://www.google.com/maps?q=${p.lat},${p.lng}`;
            const listDots = paymentDotsList(p.id, paymentsById, referenceDate);
            return (
              <div
                key={p.id}
                className="grid grid-cols-[minmax(140px,2.5fr)_0.8fr_0.8fr_0.8fr_0.8fr_1fr_1.2fr_80px] items-center gap-0 border-b border-[#e0dbd3] bg-[#fdfcfa] px-4 py-2.5 text-[0.72rem] text-[#1a1a1a] last:rounded-b-sm last:border-b-0 hover:bg-[#f5f2ec]"
              >
                <div>
                  <div className="text-[0.75rem] font-bold">{p.comuna}</div>
                  <div className="text-[0.65rem] text-[#8a8a8a]">
                    {p.tipo} · {p.m2}m² · {p.dorm}d/{p.ban}b
                  </div>
                </div>
                <div className="font-bold">{p.m2}</div>
                <div className="font-bold">{p.dorm}</div>
                <div className="font-serif text-[0.9rem] font-bold text-[#2d6a4f]">
                  {formatArriendoListCell(p)}
                </div>
                <div>
                  <span className={`font-serif text-[0.95rem] font-bold ${capRateTextClass(band)}`}>
                    {crStr}
                  </span>
                </div>
                <div className="font-bold text-[#b8962e]">{formatVentaDisplay(p)}</div>
                <div className="flex gap-0.5">
                  {listDots.map((d, i) => (
                    <div
                      key={`${p.id}-ld-${i}`}
                      className={paymentDotListClasses(d.kind)}
                      title={d.title}
                    />
                  ))}
                </div>
                <div>
                  <a
                    href={mapHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block rounded-sm bg-[#1a1a1a] px-2 py-1 text-[0.6rem] font-bold tracking-wide text-[#f7f4ef] hover:bg-[#b8962e]"
                  >
                    📍 Mapa
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
