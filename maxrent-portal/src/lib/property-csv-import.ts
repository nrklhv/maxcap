/**
 * Parses staff property inventory CSV and upserts rows by `inventory_code`.
 * Flat columns map into `Property.metadata`; `payments_json` holds up to 12 payment entries.
 * Rows whose `inventory_code` is **new** (no official `Property` yet) go to `PropertyCatalogDraft`
 * (`source: CSV`) until staff approves; existing codes update the official row in place.
 *
 * @domain maxrent-portal
 * @see upsertPropertyByInventoryCode
 * @see upsertCsvPropertyCatalogDraft
 * @see BrokerCatalogProperty
 */

import { parse } from "csv-parse/sync";
import { z } from "zod";
import * as propertyService from "@/lib/services/property.service";

const MAX_ROWS = 1000;

const PROPERTY_STATUSES = ["AVAILABLE", "RESERVED", "SOLD", "ARCHIVED"] as const;

const catalogPaymentEntrySchema = z.object({
  month: z.string().min(1),
  dias: z.coerce.number().int().min(0),
  status: z.literal("PAID").optional(),
});

const catalogPaymentsJsonSchema = z.array(catalogPaymentEntrySchema).max(12);

/** Normalize header cell to snake_case key (Excel-friendly). */
function normalizeHeaderKey(raw: string): string {
  const n = raw
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  const aliases: Record<string, string> = {
    inventorycode: "inventory_code",
    houmpropertyid: "houm_property_id",
    houm_id: "houm_property_id",
    visibletobrokers: "visible_to_brokers",
    metadatajson: "metadata_json",
    monedaventa: "moneda_venta",
    paymentsjson: "payments_json",
  };
  return aliases[n] ?? n;
}

function pickDelimiter(sampleLine: string): "," | ";" | "\t" {
  const line = sampleLine.replace(/^\uFEFF/, "").trimEnd();
  if (!line) return ",";
  const counts = {
    ",": line.split(",").length,
    ";": line.split(";").length,
    "\t": line.split("\t").length,
  } as const;
  let best: "," | ";" | "\t" = ",";
  let max = counts[","];
  if (counts[";"] > max) {
    max = counts[";"];
    best = ";";
  }
  if (counts["\t"] > max) best = "\t";
  return best;
}

function parseBooleanish(raw: string | undefined): boolean {
  if (raw === undefined || raw === null) return false;
  const s = String(raw).trim().toLowerCase();
  if (s === "" || s === "0" || s === "false" || s === "no" || s === "f") return false;
  if (s === "1" || s === "true" || s === "yes" || s === "si" || s === "sí" || s === "t" || s === "y")
    return true;
  return false;
}

function parseOptionalNumber(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  const t = String(raw).trim().replace(/\s/g, "").replace(",", ".");
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function parseOptionalInt(raw: string | undefined): number | undefined {
  const n = parseOptionalNumber(raw);
  if (n === undefined) return undefined;
  const i = Math.trunc(n);
  return Number.isFinite(i) ? i : undefined;
}

function parseFurnished(raw: string | undefined): "non" | "fully" | undefined {
  if (raw === undefined || raw === null) return undefined;
  const s = String(raw).trim().toLowerCase();
  if (s === "") return undefined;
  if (s === "fully" || s === "full" || s === "amoblado" || s === "yes" || s === "1" || s === "true")
    return "fully";
  return "non";
}

const csvRowSchema = z.object({
  inventory_code: z.string().min(1),
  title: z.string().min(1),
  status: z.string().optional(),
  visible_to_brokers: z.string().optional(),
  houm_property_id: z.string().optional(),
  comuna: z.string().optional(),
  dir: z.string().optional(),
  tipo: z.string().optional(),
  m2: z.string().optional(),
  dorm: z.string().optional(),
  ban: z.string().optional(),
  estac: z.string().optional(),
  bodega: z.string().optional(),
  gc: z.string().optional(),
  balcon: z.string().optional(),
  piscina: z.string().optional(),
  gym: z.string().optional(),
  mascotas: z.string().optional(),
  furnished: z.string().optional(),
  ac: z.string().optional(),
  fotos: z.string().optional(),
  arriendo: z.string().optional(),
  moneda: z.string().optional(),
  inicio: z.string().optional(),
  meses: z.string().optional(),
  venta: z.string().optional(),
  moneda_venta: z.string().optional(),
  lat: z.string().optional(),
  lng: z.string().optional(),
  /** Array JSON (máx. 12 ítems): month, dias, status opcional PAID */
  payments_json: z.string().optional(),
  /** Objeto JSON opcional; se fusiona al final (claves puntuales). */
  metadata_json: z.string().optional(),
});

type CsvRow = z.infer<typeof csvRowSchema>;

function normalizeStatus(raw: string | undefined): "AVAILABLE" | "RESERVED" | "SOLD" | "ARCHIVED" {
  const u = (raw ?? "").trim().toUpperCase();
  if (PROPERTY_STATUSES.includes(u as (typeof PROPERTY_STATUSES)[number])) {
    return u as (typeof PROPERTY_STATUSES)[number];
  }
  return "AVAILABLE";
}

function parsePaymentsJsonCell(raw: string | undefined): unknown[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  const t = String(raw).trim();
  if (t === "" || t === "[]") return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(t);
  } catch {
    throw new Error("payments_json no es JSON válido");
  }
  const r = catalogPaymentsJsonSchema.safeParse(parsed);
  if (!r.success) {
    throw new Error(`payments_json: ${r.error.issues.map((i) => i.message).join("; ")}`);
  }
  return r.data.length ? r.data : undefined;
}

function buildMetadata(row: CsvRow): Record<string, unknown> {
  const meta: Record<string, unknown> = {};

  const setIf = (key: string, v: unknown) => {
    if (v !== undefined && v !== null && v !== "") meta[key] = v;
  };

  setIf("comuna", row.comuna?.trim());
  setIf("dir", row.dir?.trim());
  setIf("tipo", row.tipo?.trim());

  const m2 = parseOptionalNumber(row.m2);
  if (m2 !== undefined) meta.m2 = m2;
  const dorm = parseOptionalInt(row.dorm);
  if (dorm !== undefined) meta.dorm = dorm;
  const ban = parseOptionalInt(row.ban);
  if (ban !== undefined) meta.ban = ban;

  const estac = parseOptionalInt(row.estac);
  if (estac !== undefined) meta.estac = estac;
  if (row.bodega !== undefined && String(row.bodega).trim() !== "") {
    meta.bodega = parseBooleanish(row.bodega);
  }
  const gc = parseOptionalNumber(row.gc);
  if (gc !== undefined) meta.gc = gc;
  if (row.balcon !== undefined && String(row.balcon).trim() !== "") {
    meta.balcon = parseBooleanish(row.balcon);
  }
  if (row.piscina !== undefined && String(row.piscina).trim() !== "") {
    meta.piscina = parseBooleanish(row.piscina);
  }
  if (row.gym !== undefined && String(row.gym).trim() !== "") {
    meta.gym = parseBooleanish(row.gym);
  }
  if (row.mascotas !== undefined && String(row.mascotas).trim() !== "") {
    meta.mascotas = parseBooleanish(row.mascotas);
  }
  if (row.ac !== undefined && String(row.ac).trim() !== "") {
    meta.ac = parseBooleanish(row.ac);
  }
  const furnished = parseFurnished(row.furnished);
  if (furnished !== undefined) meta.furnished = furnished;

  const fotos = parseOptionalInt(row.fotos);
  if (fotos !== undefined) meta.fotos = fotos;

  const arriendo = parseOptionalNumber(row.arriendo);
  if (arriendo !== undefined) meta.arriendo = arriendo;
  setIf("moneda", row.moneda?.trim().toLowerCase());

  setIf("inicio", row.inicio?.trim());
  const meses = parseOptionalInt(row.meses);
  if (meses !== undefined) meta.meses = meses;

  const venta = parseOptionalNumber(row.venta);
  if (venta !== undefined) meta.venta = venta;
  setIf("monedaVenta", row.moneda_venta?.trim());

  const lat = parseOptionalNumber(row.lat);
  const lng = parseOptionalNumber(row.lng);
  if (lat !== undefined) meta.lat = lat;
  if (lng !== undefined) meta.lng = lng;

  const payments = parsePaymentsJsonCell(row.payments_json);
  if (payments !== undefined) {
    meta.payments = payments;
  }

  if (row.metadata_json?.trim()) {
    try {
      const extra = JSON.parse(row.metadata_json.trim()) as unknown;
      if (extra && typeof extra === "object" && !Array.isArray(extra)) {
        Object.assign(meta, extra as Record<string, unknown>);
      }
    } catch {
      throw new Error("metadata_json no es JSON válido");
    }
  }

  return meta;
}

export type PropertyCsvImportError = { line: number; message: string };

export type PropertyCsvImportResult = {
  ok: boolean;
  processed: number;
  created: number;
  updated: number;
  errors: PropertyCsvImportError[];
};

/**
 * Parses UTF-8 CSV text (comma or semicolon), validates rows, upserts by `inventory_code`.
 * Line numbers are 1-based (header = line 1; first data row = line 2).
 */
export async function importPropertyCsvText(csvText: string): Promise<PropertyCsvImportResult> {
  const errors: PropertyCsvImportError[] = [];
  let created = 0;
  let updated = 0;

  const trimmed = csvText.trim();
  if (!trimmed) {
    return { ok: false, processed: 0, created: 0, updated: 0, errors: [{ line: 0, message: "Archivo vacío" }] };
  }

  const firstLineEnd = trimmed.search(/\r?\n/);
  const headerLine = firstLineEnd === -1 ? trimmed : trimmed.slice(0, firstLineEnd);
  const delimiter = pickDelimiter(headerLine);

  let rawRows: Record<string, string | undefined>[];
  try {
    rawRows = parse(trimmed, {
      columns: (headers: string[]) => headers.map((h) => normalizeHeaderKey(String(h))),
      skip_empty_lines: true,
      trim: true,
      bom: true,
      delimiter,
      relax_column_count: true,
      cast: false,
    }) as Record<string, string | undefined>[];
  } catch (e) {
    const msg = e instanceof Error ? e.message : "CSV inválido";
    return { ok: false, processed: 0, created: 0, updated: 0, errors: [{ line: 0, message: msg }] };
  }

  if (rawRows.length > MAX_ROWS) {
    return {
      ok: false,
      processed: 0,
      created: 0,
      updated: 0,
      errors: [{ line: 0, message: `Máximo ${MAX_ROWS} filas de datos` }],
    };
  }

  const seenCodes = new Set<string>();
  let line = 2;

  for (const raw of rawRows) {
    const parsed = csvRowSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join("; ");
      errors.push({ line, message: msg });
      line += 1;
      continue;
    }

    const row = parsed.data;
    const code = row.inventory_code.trim();
    if (seenCodes.has(code)) {
      errors.push({ line, message: `inventory_code duplicado en el archivo: ${code}` });
      line += 1;
      continue;
    }
    seenCodes.add(code);

    let built: Record<string, unknown>;
    try {
      built = buildMetadata(row);
    } catch (e) {
      errors.push({
        line,
        message: e instanceof Error ? e.message : "Error en metadata",
      });
      line += 1;
      continue;
    }

    const status = normalizeStatus(row.status);
    const visibleToBrokers = parseBooleanish(row.visible_to_brokers);
    const houmRaw = row.houm_property_id?.trim();
    const houm = houmRaw ? houmRaw : undefined;

    try {
      const existing = await propertyService.findPropertyByInventoryCode(code);
      let metadataPayload: Record<string, unknown> | undefined;
      if (existing) {
        const prev =
          existing.metadata &&
          typeof existing.metadata === "object" &&
          !Array.isArray(existing.metadata)
            ? { ...(existing.metadata as Record<string, unknown>) }
            : {};
        metadataPayload = { ...prev, ...built };
      } else {
        metadataPayload = Object.keys(built).length ? built : undefined;
      }
      if (metadataPayload && Object.keys(metadataPayload).length === 0) {
        metadataPayload = undefined;
      }

      if (existing) {
        await propertyService.upsertPropertyByInventoryCode({
          inventoryCode: code,
          title: row.title.trim(),
          status,
          visibleToBrokers,
          metadata: metadataPayload,
          houmPropertyId: houm,
        });
        updated += 1;
      } else {
        await propertyService.upsertCsvPropertyCatalogDraft({
          inventoryCode: code,
          title: row.title.trim(),
          metadata: metadataPayload,
          houmPropertyId: houm,
          pendingPropertyStatus: status,
          pendingVisibleToBrokers: visibleToBrokers,
        });
        created += 1;
      }
    } catch (e) {
      errors.push({
        line,
        message: e instanceof Error ? e.message : "Error al guardar",
      });
    }
    line += 1;
  }

  const processed = rawRows.length;
  const ok = errors.length === 0;
  return { ok, processed, created, updated, errors };
}

/** Column order for the downloadable template (single header line). */
export const PROPERTY_CSV_TEMPLATE_HEADER =
  "inventory_code,title,status,visible_to_brokers,houm_property_id,comuna,dir,tipo,m2,dorm,ban,estac,bodega,gc,balcon,piscina,gym,mascotas,furnished,ac,fotos,arriendo,moneda,inicio,meses,venta,moneda_venta,lat,lng,payments_json,metadata_json";

/** CSV plantilla (UTF-8 BOM) con cabecera y una fila de ejemplo. */
export function propertyCsvTemplateContent(): string {
  const paymentsJson = JSON.stringify([
    { month: "2025-01", dias: 0, status: "PAID" as const },
    { month: "2025-02", dias: 2 },
  ]);
  const paymentsEsc = paymentsJson.replace(/"/g, '""');
  const example = [
    "MR-INV-001",
    '"Depto ejemplo Centro"',
    "AVAILABLE",
    "false",
    "",
    "Santiago",
    '"Av. Libertador 100"',
    "Departamento",
    "55",
    "2",
    "2",
    "1",
    "true",
    "85000",
    "true",
    "false",
    "false",
    "true",
    "fully",
    "true",
    "6",
    "450000",
    "pesos",
    "2025-01-01",
    "12",
    "2800",
    "UF",
    "-33.4520645",
    "-70.6436254",
    `"${paymentsEsc}"`,
    '""',
  ].join(",");
  return `\uFEFF${PROPERTY_CSV_TEMPLATE_HEADER}\n${example}\n`;
}
