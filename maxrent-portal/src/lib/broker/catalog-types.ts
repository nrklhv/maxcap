/**
 * Types for the broker property catalog (ficha v3 demo).
 * Shapes mirror the reference HTML prototype; future Houm/Prisma rows map into these fields.
 *
 * @domain broker
 */

export type BrokerCatalogMonedaArriendo = "pesos" | "uf";

export type BrokerCatalogMonedaVenta = "UF" | "Pesos";

export type BrokerCatalogFurnished = "non" | "fully";

/** One row in the catalog grid/list. */
export interface BrokerCatalogProperty {
  id: number;
  dir: string;
  comuna: string;
  tipo: string;
  m2: number;
  dorm: number;
  ban: number;
  estac: number;
  bodega: boolean;
  gc: number;
  balcon: boolean;
  piscina: boolean;
  gym: boolean;
  mascotas: boolean;
  furnished: BrokerCatalogFurnished;
  ac: boolean;
  arriendo: number;
  moneda: BrokerCatalogMonedaArriendo;
  inicio: string;
  meses: number;
  venta: number;
  monedaVenta: BrokerCatalogMonedaVenta;
  fotos: number;
  lat: number;
  lng: number;
}

/** Monthly payment record for score / 12-month dots. */
export interface BrokerCatalogPaymentEntry {
  month: string;
  dias: number;
  status?: "PAID";
}

export type BrokerCatalogPaymentsByPropertyId = Record<number, BrokerCatalogPaymentEntry[]>;

export type PaymentDotKind =
  | "nodata"
  | "future"
  | "paid"
  | "late-leve"
  | "late-mod"
  | "late-grave";

export interface PaymentDotCell {
  kind: PaymentDotKind;
  title: string;
  /** Short label inside the dot (card view). */
  symbol: string;
}

export type CapRateBand = "good" | "mid" | "low";

export type CatalogDormFilter = "all" | "1" | "2";

export type CatalogPriceFilter = "all" | "0-2000" | "2000-3000" | "3000-5000" | "5000+";

export type CatalogSortDropdown =
  | "default"
  | "precio-asc"
  | "precio-desc"
  | "caprate-desc"
  | "caprate-asc";

export type CatalogListSortColumn =
  | "comuna"
  | "m2"
  | "dorm"
  | "arriendo"
  | "caprate"
  | "precio";
