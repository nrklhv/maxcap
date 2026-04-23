/**
 * Maps a Houm API property object into flat catalog keys at `Property.metadata` root
 * alongside `metadata.houm`, matching aliases used by `staffPropertyListDisplay`.
 *
 * @domain maxrent-portal
 * @pure
 * @see staffPropertyListDisplay
 */

import type { HoumPropertyRaw } from "@/lib/houm/houm-list-response";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function pickString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
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

/** Shallow patch of catalog-like keys from Houm raw (omit keys with no value). */
export function catalogFlatPatchFromHoumRaw(raw: HoumPropertyRaw): Record<string, unknown> {
  const r = asRecord(raw);
  if (!r) return {};

  const out: Record<string, unknown> = {};

  const comuna = pickString(
    r.comuna,
    r.commune,
    r.commune_name,
    r.city,
    r.region,
    r.district
  );
  if (comuna) out.comuna = comuna;

  const dir = pickString(
    r.dir,
    r.address,
    r.full_address,
    r.fullAddress,
    r.street,
    r.address_line1,
    r.addressLine1
  );
  if (dir) out.dir = dir;

  const tipo = pickString(r.tipo, r.type, r.property_type, r.propertyType);
  if (tipo) out.tipo = tipo;

  const m2 = pickNumber(
    r.m2,
    r.surface,
    r.area,
    r.square_meters,
    r.sqm,
    r.usable_area,
    r.built_area
  );
  if (m2 != null) out.m2 = m2;

  const dorm = pickNumber(r.dorm, r.bedrooms, r.dormitorios, r.rooms, r.bedroom_count);
  if (dorm != null) out.dorm = dorm;

  const ban = pickNumber(r.ban, r.bathrooms, r.banos, r.bathroom_count);
  if (ban != null) out.ban = ban;

  const estac = pickNumber(r.estac, r.parking, r.estacionamientos, r.parking_lots);
  if (estac != null) out.estac = estac;

  const moneda = pickString(r.moneda, r.rent_currency, r.rentCurrency);
  if (moneda) out.moneda = moneda.toLowerCase();

  const arriendo = pickNumber(
    r.arriendo,
    r.rent,
    r.monthly_rent,
    r.rent_clp,
    r.monthlyRent,
    r.monthly_rent_clp
  );
  if (arriendo != null) out.arriendo = arriendo;

  const monedaVenta = pickString(
    r.monedaVenta,
    r.sale_currency,
    r.currency_sale,
    r.saleCurrency
  );
  if (monedaVenta) out.monedaVenta = monedaVenta;

  const venta = pickNumber(
    r.venta,
    r.sale_price,
    r.price,
    r.sale_uf,
    r.uf_price,
    r.list_price,
    r.salePrice
  );
  if (venta != null) out.venta = venta;

  const lat = pickNumber(r.lat, r.latitude);
  if (lat != null) out.lat = lat;

  const lng = pickNumber(r.lng, r.longitude, r.lon);
  if (lng != null) out.lng = lng;

  return out;
}
