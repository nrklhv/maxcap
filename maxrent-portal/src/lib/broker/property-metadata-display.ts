/**
 * Derives catalog-style list fields from `Property.metadata` JSON (Houm sync or manual).
 * Used by staff list view to mirror broker catalog columns when data exists.
 *
 * @domain broker
 * @pure
 */

import type { BrokerCatalogMonedaArriendo, BrokerCatalogMonedaVenta } from "./catalog-types";
import {
  CATALOG_UF_CLP,
  capRateFromMonthlyClpAndSaleClp,
  formatClp,
  formatPct,
} from "./catalog-calculations";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function pickNumber(...values: unknown[]): number | null {
  for (const v of values) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      if (!Number.isNaN(n) && Number.isFinite(n)) return n;
    }
  }
  return null;
}

function pickString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/** Human-readable inventory status for staff UI (values remain API enums). */
function propertyInventoryStatusLabel(code: string): string {
  const u = code.trim().toUpperCase();
  const map: Record<string, string> = {
    AVAILABLE: "Disponible",
    RESERVED: "Reservado",
    SOLD: "Vendido",
    ARCHIVED: "Archivado",
  };
  return map[u] ?? code;
}

/** Sí/No for booleans and common string forms; `null` if absent. */
function pickOptionalBoolLabel(v: unknown): string | null {
  if (v === true) return "Sí";
  if (v === false) return "No";
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "") return null;
    if (s === "1" || s === "true" || s === "yes" || s === "si" || s === "sí") return "Sí";
    if (s === "0" || s === "false" || s === "no") return "No";
    return v.trim();
  }
  return null;
}

function formatFurnished(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "") return null;
    if (s === "fully" || s === "full" || s === "amoblado") return "Amoblado";
    if (s === "non" || s === "no" || s === "sin") return "Sin amoblar";
  }
  return String(v);
}

/** Short line for `metadata.payments` (CSV `payments_json`). */
function formatPaymentsSummary(payments: unknown): string {
  if (!Array.isArray(payments) || payments.length === 0) return "—";
  const max = 8;
  const parts: string[] = [];
  for (let i = 0; i < payments.length && i < max; i += 1) {
    const item = payments[i];
    if (!item || typeof item !== "object") {
      parts.push("?");
      continue;
    }
    const o = item as Record<string, unknown>;
    const mRaw = o.month;
    const m =
      mRaw === undefined || mRaw === null || String(mRaw).trim() === ""
        ? "?"
        : String(mRaw).trim();
    const dias = pickNumber(o.dias);
    const st = pickString(o.status);
    parts.push(
      `${m}${dias != null ? ` (${dias} d.)` : ""}${st ? ` ${st}` : ""}`.trim()
    );
  }
  const more = payments.length > max ? ` … (+${payments.length - max})` : "";
  return parts.join(" · ") + more;
}

/**
 * Flattens `Property.metadata` for catalog list/detail picks.
 *
 * **Precedence (low → high):** `catalog` | `raw` | `payload` (first defined among the three)
 * → **`houm`** (blob from Houm M2M sync, stored as `metadata.houm`)
 * → **top-level keys** on `metadata` (CSV import, staff edits, or `metadata_json` merge).
 *
 * Top-level therefore overrides Houm for the same key (e.g. staff-corrected `comuna`).
 *
 * @see docs/HOUM_CATALOG_METADATA.md
 * @pure
 */
export function mergedMetadataRoot(metadata: unknown): Record<string, unknown> {
  const top = asRecord(metadata);
  if (!top) return {};
  const nested =
    asRecord(top.catalog) ?? asRecord(top.raw) ?? asRecord(top.payload) ?? {};
  const fromHoum = asRecord(top.houm) ?? {};
  return { ...nested, ...fromHoum, ...top };
}

export interface StaffPropertyListDisplay {
  headline: string;
  subline: string;
  /** Dirección u otra línea de contexto desde metadata (si existe). */
  addressLine: string | null;
  /** Tipo de inmueble legible (metadata). */
  tipoLabel: string;
  m2: string;
  dorm: string;
  ban: string;
  arriendoCell: string;
  ventaCell: string;
  capRatePct: number | null;
  capRateLabel: string;
  lat: number | null;
  lng: number | null;
  /** Arriendo mensual normalizado a CLP (null si no hay dato); para ordenar columnas. */
  sortRentClp: number | null;
  /** Precio de venta en CLP (null si no hay dato); para ordenar columnas. */
  sortSaleClp: number | null;
}

/** Input for the staff expandable detail panel. */
export interface StaffPropertyExpandedInput {
  id: string;
  title: string;
  status: string;
  visibleToBrokers: boolean;
  /** Clave de negocio para import CSV / inventario. */
  inventoryCode?: string | null;
  houmPropertyId?: string | null;
  metadata: unknown;
}

export interface StaffPropertyExpandedBlock {
  /** Key facts for the detail grid. */
  rows: { label: string; value: string }[];
  /** Pretty-printed JSON for the raw `metadata` column, or a short placeholder. */
  metadataJson: string;
}

function normalizeMonedaArriendo(v: unknown): BrokerCatalogMonedaArriendo {
  const s = typeof v === "string" ? v.toLowerCase() : "";
  return s === "uf" ? "uf" : "pesos";
}

function normalizeMonedaVenta(v: unknown): BrokerCatalogMonedaVenta {
  const s = typeof v === "string" ? v : "";
  return s === "Pesos" || s === "CLP" || s === "clp" ? "Pesos" : "UF";
}

/**
 * Build display row for staff/broker list UIs from DB `title` + `metadata`.
 */
export function staffPropertyListDisplay(
  title: string,
  metadata: unknown
): StaffPropertyListDisplay {
  const r = mergedMetadataRoot(metadata);

  const comuna =
    pickString(
      r.comuna,
      r.commune,
      r.commune_name,
      r.city,
      r.region,
      r.district
    ) ?? "";
  const tipo = pickString(r.tipo, r.type, r.property_type, r.propertyType) ?? "—";
  const m2n = pickNumber(
    r.m2,
    r.surface,
    r.area,
    r.square_meters,
    r.sqm,
    r.usable_area,
    r.built_area
  );
  const dormn = pickNumber(r.dorm, r.bedrooms, r.dormitorios, r.rooms, r.bedroom_count);
  const bann = pickNumber(r.ban, r.bathrooms, r.banos, r.bathroom_count);
  const estacn = pickNumber(r.estac, r.parking, r.estacionamientos, r.parking_lots);

  const monedaArr = normalizeMonedaArriendo(r.moneda ?? r.rent_currency ?? r.rentCurrency);
  const arriendoRaw = pickNumber(
    r.arriendo,
    r.rent,
    r.monthly_rent,
    r.rent_clp,
    r.monthlyRent,
    r.monthly_rent_clp
  );
  const monedaVenta = normalizeMonedaVenta(
    r.monedaVenta ?? r.sale_currency ?? r.currency_sale ?? r.saleCurrency
  );
  const ventaRaw = pickNumber(
    r.venta,
    r.sale_price,
    r.price,
    r.sale_uf,
    r.uf_price,
    r.list_price,
    r.salePrice
  );

  const lat = pickNumber(r.lat, r.latitude);
  const lng = pickNumber(r.lng, r.longitude, r.lon);

  const m2 = m2n != null ? String(m2n) : "—";
  const dorm = dormn != null ? String(dormn) : "—";
  const ban = bann != null ? String(bann ?? 0) : "—";

  const dir = pickString(
    r.dir,
    r.address,
    r.full_address,
    r.fullAddress,
    r.street,
    r.address_line1,
    r.addressLine1
  );
  const headline = comuna || title;
  const hasSpecs = m2n != null || dormn != null || bann != null || estacn != null;
  const estacPart = estacn != null ? ` · ${estacn} est.` : "";
  const subline = hasSpecs
    ? `${tipo} · ${m2}m² · ${dorm}d/${ban}b${estacPart}`
    : dir || (headline === title ? "" : title);

  let arriendoCell = "—";
  let ventaCell = "—";
  let arriendoClp: number | null = null;
  let ventaClp: number | null = null;

  if (arriendoRaw != null) {
    arriendoClp = monedaArr === "uf" ? arriendoRaw * CATALOG_UF_CLP : arriendoRaw;
    arriendoCell =
      monedaArr === "uf" ? `${arriendoRaw} UF` : formatClp(arriendoRaw);
  }

  if (ventaRaw != null) {
    ventaClp =
      monedaVenta === "UF" ? ventaRaw * CATALOG_UF_CLP : ventaRaw;
    ventaCell =
      monedaVenta === "UF"
        ? `${ventaRaw.toLocaleString("es-CL")} UF`
        : formatClp(ventaRaw);
  }

  const capRatePct =
    arriendoClp != null && ventaClp != null
      ? capRateFromMonthlyClpAndSaleClp(arriendoClp, ventaClp)
      : null;
  const capRateLabel = capRatePct != null ? formatPct(capRatePct) : "N/D";

  const addressLine = dir && dir.length > 0 ? dir : null;

  return {
    headline,
    subline,
    addressLine,
    tipoLabel: tipo,
    m2,
    dorm,
    ban,
    arriendoCell,
    ventaCell,
    capRatePct,
    capRateLabel,
    lat,
    lng,
    sortRentClp: arriendoClp,
    sortSaleClp: ventaClp,
  };
}

/**
 * Builds label/value rows and formatted JSON for the staff property detail drawer.
 *
 * @domain broker
 * @pure
 * @see staffPropertyListDisplay
 */
export function staffPropertyExpandedFields(
  input: StaffPropertyExpandedInput
): StaffPropertyExpandedBlock {
  const { id, title, status, visibleToBrokers, inventoryCode, houmPropertyId, metadata } =
    input;
  const d = staffPropertyListDisplay(title, metadata);
  const r = mergedMetadataRoot(metadata);

  const comuna =
    pickString(
      r.comuna,
      r.commune,
      r.commune_name,
      r.city,
      r.region,
      r.district
    ) ?? "—";
  const monedaArr = normalizeMonedaArriendo(r.moneda ?? r.rent_currency ?? r.rentCurrency);
  const monedaVenta = normalizeMonedaVenta(
    r.monedaVenta ?? r.sale_currency ?? r.currency_sale ?? r.saleCurrency
  );

  const estacVal = pickNumber(r.estac, r.parking, r.estacionamientos);
  const gcVal = pickNumber(r.gc, r.gastos_comunes, r.common_expenses);
  const fotosVal = pickNumber(r.fotos, r.photos_count, r.photo_count);
  const mesesVal = pickNumber(r.meses, r.months, r.plazo_meses);

  const latStr =
    d.lat != null && Number.isFinite(d.lat) ? String(d.lat) : "—";
  const lngStr =
    d.lng != null && Number.isFinite(d.lng) ? String(d.lng) : "—";

  const rows: { label: string; value: string }[] = [
    { label: "ID", value: id },
    {
      label: "Código inventario",
      value: inventoryCode?.trim() ? inventoryCode.trim() : "—",
    },
    { label: "Título (BD)", value: title },
    { label: "Houm property ID", value: houmPropertyId?.trim() ? houmPropertyId : "—" },
    { label: "Estado inventario", value: propertyInventoryStatusLabel(status) },
    {
      label: "Publicado",
      value: visibleToBrokers ? "Sí" : "No",
    },
    { label: "Comuna / ciudad", value: comuna },
    { label: "Tipo", value: d.tipoLabel },
    { label: "Superficie (m²)", value: d.m2 },
    { label: "Dormitorios", value: d.dorm },
    { label: "Baños", value: d.ban },
    {
      label: "Estacionamientos",
      value: estacVal != null ? String(estacVal) : "—",
    },
    { label: "Bodega", value: pickOptionalBoolLabel(r.bodega) ?? "—" },
    {
      label: "Gastos comunes (aprox.)",
      value: gcVal != null ? String(gcVal) : "—",
    },
    { label: "Balcón", value: pickOptionalBoolLabel(r.balcon) ?? "—" },
    { label: "Piscina", value: pickOptionalBoolLabel(r.piscina) ?? "—" },
    { label: "Gimnasio", value: pickOptionalBoolLabel(r.gym) ?? "—" },
    { label: "Mascotas", value: pickOptionalBoolLabel(r.mascotas) ?? "—" },
    { label: "Aire acondicionado", value: pickOptionalBoolLabel(r.ac) ?? "—" },
    { label: "Amoblado", value: formatFurnished(r.furnished) ?? "—" },
    {
      label: "Fotos (cantidad)",
      value: fotosVal != null ? String(fotosVal) : "—",
    },
    { label: "Inicio contrato / disponibilidad", value: pickString(r.inicio, r.start_date) ?? "—" },
    {
      label: "Plazo (meses)",
      value: mesesVal != null ? String(mesesVal) : "—",
    },
    { label: "Moneda arriendo", value: monedaArr === "uf" ? "UF" : "CLP" },
    { label: "Arriendo", value: d.arriendoCell },
    { label: "Moneda venta", value: monedaVenta },
    { label: "Precio venta", value: d.ventaCell },
    { label: "Cap rate (estimado)", value: d.capRateLabel },
    { label: "Pagos (catálogo)", value: formatPaymentsSummary(r.payments) },
    { label: "Latitud", value: latStr },
    { label: "Longitud", value: lngStr },
    { label: "Dirección", value: d.addressLine ?? "—" },
  ];

  let metadataJson: string;
  if (metadata === null || metadata === undefined) {
    metadataJson = "Sin metadata.";
  } else {
    try {
      metadataJson = JSON.stringify(metadata, null, 2);
    } catch {
      metadataJson = String(metadata);
    }
  }

  return { rows, metadataJson };
}
