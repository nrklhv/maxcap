/**
 * Parser puro del Excel "LAB Capital Venta.xlsx" para importar al modelo de Pool.
 *
 * No depende de Prisma ni de I/O — solo funciones que toman datos crudos y
 * devuelven objetos listos para persistir. Eso lo hace testeable sin BD ni
 * archivos reales.
 *
 * @domain pool
 */

/** Forma del row crudo que esperamos del Excel (después de leer con SheetJS). */
export interface RawLabRow {
  Id?: number | string | null;
  "En Venta"?: string | null;
  Dirección?: string | null;
  Depto?: string | null;
  "Valor Venta"?: number | null;
  "Valor Venta $"?: number | null;
  "Valor Arriendo"?: number | null;
  "Valor Arriendo Abril"?: number | null;
  Estado?: string | null;
  /** "Superficie\nútil (m2)" tal cual del archivo. */
  "Superficie\nútil (m2)"?: number | null;
  "Superficie\nterraza (m2)"?: number | null;
  Dorm?: number | null;
  Baño?: number | null;
  Comuna?: string | null;
  [k: string]: unknown;
}

/** Atributos calculados y normalizados de cada unidad del pool, listos para upsert. */
export interface ParsedPoolUnit {
  /** El "Id" del Excel, como string. Sirve como `externalId` único dentro del pool. */
  externalId: string;
  /** Etiqueta pública (ej. "Unidad #ID — comuna"). No incluye dirección exacta. */
  label: string;
  /** Renta bruta mensual estimada (CLP). Usamos `Valor Arriendo Abril` y caemos a `Valor Arriendo`. */
  monthlyRentClp: number;
  /** Precio calculado: arriendo anual / cap rate. */
  priceClp: number;
  /** Precio convertido a UF al valor pasado como parámetro. */
  priceUf: number;
  /** Estado de arrendamiento mapeado al enum. */
  ocupacion: PoolUnitOcupacionEnum;
  comuna: string | null;
  dormitorios: number | null;
  banos: number | null;
  superficieUtilM2: number | null;
  superficieTerrazaM2: number | null;
  /** Datos sensibles (dirección, depto, estado raw, todo el row). NO mostrar al inversionista. */
  internalData: {
    direccionExacta: string | null;
    depto: string | null;
    estadoRaw: string | null;
    raw: Record<string, unknown>;
  };
}

/** Espejo del enum Prisma `PoolUnitOcupacion`. Lo dejamos string para no depender del runtime. */
export type PoolUnitOcupacionEnum =
  | "ARRENDADO"
  | "VACANTE"
  | "POR_DESOCUPARSE"
  | "AVISO_SALIDA"
  | "AVISADO_PARA_DESOCUPAR"
  | "PUBLICADA";

/** Mapeo del texto del Excel al enum tipado. */
function mapEstado(raw: unknown): PoolUnitOcupacionEnum {
  if (typeof raw !== "string") return "VACANTE";
  const norm = raw.trim().toLowerCase();
  switch (norm) {
    case "arrendado":
      return "ARRENDADO";
    case "vacante":
      return "VACANTE";
    case "por desocuparse":
      return "POR_DESOCUPARSE";
    case "aviso salida":
      return "AVISO_SALIDA";
    case "avisado para desocupar":
      return "AVISADO_PARA_DESOCUPAR";
    case "publicada":
      return "PUBLICADA";
    default:
      return "VACANTE";
  }
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(/[^\d.,-]/g, "").replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function str(v: unknown): string | null {
  if (typeof v === "string" && v.trim() !== "") return v.trim();
  if (typeof v === "number") return String(v);
  return null;
}

/**
 * Filtra los rows que entran al pool (En Venta = "Sí") y los normaliza.
 * Rows sin Id o sin arriendo se descartan silenciosamente (con `discardedReasons`).
 *
 * @param rows  Resultado de `xlsx.utils.sheet_to_json(sheet)` con headers como keys.
 * @param opts  Parámetros del import.
 * @returns     Unidades parseadas + lista de descartes con motivo.
 */
export function parseLabExcelRows(
  rows: RawLabRow[],
  opts: { capRateBruto: number; ufValueClp: number }
): { units: ParsedPoolUnit[]; discarded: Array<{ row: RawLabRow; reason: string }> } {
  if (!(opts.capRateBruto > 0 && opts.capRateBruto < 1)) {
    throw new Error(
      `capRateBruto debe estar entre 0 y 1 (ej. 0.058 para 5,8%). Recibido: ${opts.capRateBruto}`
    );
  }
  if (!(opts.ufValueClp > 0)) {
    throw new Error(
      `ufValueClp debe ser positivo (CLP). Recibido: ${opts.ufValueClp}`
    );
  }

  const units: ParsedPoolUnit[] = [];
  const discarded: Array<{ row: RawLabRow; reason: string }> = [];

  for (const row of rows) {
    const id = row.Id;
    if (id === undefined || id === null || String(id).trim() === "") {
      discarded.push({ row, reason: "sin Id" });
      continue;
    }
    if (row["En Venta"] !== "Si") {
      discarded.push({ row, reason: `En Venta != "Si" (${row["En Venta"] ?? "vacío"})` });
      continue;
    }
    const monthlyRent = num(row["Valor Arriendo Abril"]) ?? num(row["Valor Arriendo"]);
    if (monthlyRent === null || monthlyRent <= 0) {
      discarded.push({ row, reason: "sin valor de arriendo" });
      continue;
    }
    const priceClp = (monthlyRent * 12) / opts.capRateBruto;
    const priceUf = priceClp / opts.ufValueClp;
    const comuna = str(row.Comuna);
    const externalId = String(id).replace(/\.0$/, ""); // los ids del Excel a veces vienen como float

    units.push({
      externalId,
      label: comuna ? `Unidad #${externalId} · ${comuna}` : `Unidad #${externalId}`,
      monthlyRentClp: Math.round(monthlyRent),
      priceClp: Math.round(priceClp),
      priceUf: Math.round(priceUf * 100) / 100, // 2 decimales
      ocupacion: mapEstado(row.Estado),
      comuna,
      dormitorios: num(row.Dorm) !== null ? Math.round(num(row.Dorm)!) : null,
      banos: num(row.Baño) !== null ? Math.round(num(row.Baño)!) : null,
      superficieUtilM2: num(row["Superficie\nútil (m2)"]),
      superficieTerrazaM2: num(row["Superficie\nterraza (m2)"]),
      internalData: {
        direccionExacta: str(row.Dirección),
        depto: str(row.Depto),
        estadoRaw: str(row.Estado),
        raw: { ...row },
      },
    });
  }

  return { units, discarded };
}

/** Cálculo de métricas agregadas del pool a partir de las unidades parseadas. */
export function computePoolMetrics(units: ParsedPoolUnit[]): {
  totalUnits: number;
  totalValueUf: number;
  totalMonthlyRentClp: number;
  occupancyPct: number | null;
} {
  const totalUnits = units.length;
  const totalValueUf = units.reduce((acc, u) => acc + u.priceUf, 0);
  const totalMonthlyRentClp = units.reduce((acc, u) => acc + u.monthlyRentClp, 0);
  const arrendadas = units.filter((u) => u.ocupacion === "ARRENDADO").length;
  const occupancyPct = totalUnits > 0 ? (arrendadas / totalUnits) * 100 : null;
  return {
    totalUnits,
    totalValueUf: Math.round(totalValueUf * 100) / 100,
    totalMonthlyRentClp: Math.round(totalMonthlyRentClp),
    occupancyPct: occupancyPct !== null ? Math.round(occupancyPct * 10) / 10 : null,
  };
}
