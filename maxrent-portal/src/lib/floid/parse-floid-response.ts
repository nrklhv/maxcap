/**
 * Parsea el payload del **Floid Widget** (3 productos agregados: SP renta + SII carpeta + CMF deuda)
 * en un reporte estructurado para mostrar al inversionista y al staff.
 *
 * Diseño:
 *   - NO calcula score / riskLevel / maxApprovedAmount: el equipo staff revisa
 *     manualmente y aprueba habilitando reservas.
 *   - Produce un `summary` corto en español + secciones tipadas + totales útiles
 *     pre-calculados para evitar lógica en el frontend.
 *   - Acepta payloads parciales: si el widget devolvió solo CMF (los otros productos
 *     fallaron), `sp` y `sii` quedan en null pero el reporte se considera válido.
 *
 * Shape del widget capturado en producción 2026-04-28
 * (admin.floid.app/houm_management/widget/<id>):
 * ```
 * {
 *   code: 200, message: "OK",
 *   consumerId: "<RUT>", caseid: "<uuid>", custom: "<evaluationId>",
 *   download_pdf: "<url>",
 *   SP:  { renta_imponible: { period, remuneracion, meses_cotizados, ... } },
 *   SII: { carpeta_tributaria: { data: { ... } } },
 *   CMF: { deuda: { data: { directDebt[], indirectDebt[], credits.lines[] } } }
 * }
 * ```
 *
 * @domain creditEvaluation
 */

import { z } from "zod";

// ──────────────────────────────────────────────────────────────────────────────
// Tipos públicos
// ──────────────────────────────────────────────────────────────────────────────

export interface FloidWidgetReport {
  /** RUT del consumidor (formato 12345678-9) tal como Floid lo devuelve. */
  consumerId: string | null;
  /** caseid global generado por el widget. */
  caseid: string | null;
  /** Valor del query param `?custom=` que enviamos al abrir el widget (= `CreditEvaluation.id`). */
  custom: string | null;
  /** URL absoluta al PDF del reporte completo (Floid lo genera). */
  downloadPdfUrl: string | null;
  /** Resumen corto legible (1–2 oraciones) para encabezar las vistas. */
  summary: string;
  /** Sección Superintendencia de Pensiones — null si no se ejecutó el producto. */
  sp: SpRentaImponibleSection | null;
  /** Sección SII carpeta tributaria — null si no se ejecutó el producto. */
  sii: SiiCarpetaTributariaSection | null;
  /** Sección CMF deuda — null si no se ejecutó el producto. */
  cmf: CmfDeudaSection | null;
  /** Errores por sección (Floid devolvió `code != 200` o `error_code`). */
  errors: ReportErrors;
  /** true si Floid marcó el payload como Partial Content (`code: 206`) o hay errores por sección. */
  partial: boolean;
  /** JSON crudo recibido (para auditoría y para mostrar "ver detalle completo"). */
  rawResponse: Record<string, unknown>;
}

/** Mapa de errores por sección reportados por Floid. */
export interface ReportErrors {
  sp?: SectionError;
  sii?: SectionError;
  cmf?: SectionError;
}

export interface SectionError {
  code: string;
  errorCode: string | null;
  /** Mensaje legible para mostrar al usuario, ya en español si lo trae Floid. */
  message: string;
}

export interface SpRentaImponibleSection {
  remuneracion: number | null;
  mesesCotizados: number | null;
  period: string | null;
  moneda: string | null;
  fuente: string | null;
  fechaConsulta: string | null;
}

export interface SiiCarpetaTributariaSection {
  nombreEmisor: string | null;
  rutEmisor: string | null;
  fechaInicioActividades: string | null;
  /** Lista completa de actividades económicas (shape nuevo `actividades_economicas`). */
  actividadesEconomicas: string[];
  /** Primera actividad económica (compatibilidad con UI vieja). */
  actividadEconomica: string | null;
  /** Detalle con código + descripción (shape nuevo `actividades_economicas_detalle` o viejo `actividad_economia_detalle`). */
  actividadEconomicaDetalle: Array<{ codigo: string; descripcion: string }>;
  categoriaTributaria: string | null;
  domicilio: string | null;
  sucursal: string | null;
  observacionesTributarias: string | null;
  ultimosDocumentosTimbrados: string[];
  /** Sociedades en las que el contribuyente participa (shape nuevo). */
  participacionSociedades: ParticipacionSociedad[];
  /** Representantes legales (shape nuevo). Puede ser array de strings o de objetos según el caso. */
  representantesLegales: string[];
  bienesRaices: BienRaiz[];
  /** Suma de `avaluoFiscal` de todos los bienes raíces. */
  totalAvaluoFiscal: number;
  cantidadBienesRaices: number;
  boletasHonorariosCount: number;
  /** Años disponibles del F22, ordenados ascendentemente. */
  f22Years: string[];
  /** F22 detallado por año (códigos crudos). */
  f22ByYear: Record<string, F22YearData>;
  /** Highlights del F22 más reciente — para mostrar en resumen. */
  latestF22: F22Highlights | null;
}

export interface ParticipacionSociedad {
  rut: string | null;
  razonSocial: string | null;
  fechaIncorporacion: string | null;
}

export interface F22YearData {
  year: string;
  /** Diccionario completo de códigos del Formulario 22, tal como viene del SII. */
  codigos: Record<string, string>;
  /** Subset de códigos que SII destaca con etiquetas amigables. */
  glosa: Record<string, string>;
}

/**
 * Métricas más relevantes del F22 más reciente, mapeadas desde códigos comunes.
 * Códigos basados en el F22 chileno (fuente: declaración renta SII):
 *   170  = Total renta líquida imponible
 *   1098 = Base imponible global complementario
 *   158  = Total impuestos personales (IGC + impto. único)
 *   304  = Diferencia (saldo a favor o por pagar)
 *   305  = Devolución
 */
export interface F22Highlights {
  year: string;
  rentaLiquidaImponible: number | null;
  baseImponible: number | null;
  totalImpuesto: number | null;
  diferencia: number | null;
  devolucion: number | null;
}

export interface BienRaiz {
  comuna: string | null;
  rol: string | null;
  direccion: string | null;
  destino: string | null;
  avaluoFiscal: number | null;
  /** true si tiene cuotas vencidas por pagar. Tolerante a "SI"/"NO" o bool. */
  cuotasVencidas: boolean;
  /** true si tiene cuotas vigentes por pagar. */
  cuotasVigentes: boolean;
  condicion: string | null;
}

export interface CmfDeudaSection {
  name: string | null;
  rut: string | null;
  /** Fecha de actualización del reporte CMF (YYYY-MM-DD). */
  updated: string | null;
  directDebt: DebtItem[];
  indirectDebt: DebtItem[];
  creditLines: CreditLine[];
  totalDirectDebt: number;
  totalIndirectDebt: number;
  totalDebt: number;
  totalDebt30To89: number;
  totalDebt90Plus: number;
  totalLinesDirect: number;
  totalLinesIndirect: number;
  /** Lista única de instituciones presentes en deuda directa o indirecta o líneas. */
  institutions: string[];
}

export interface DebtItem {
  institution: string;
  currentDebt: number;
  between30To89Days: number;
  over90Days: number;
  total: number;
}

export interface CreditLine {
  institution: string;
  direct: number;
  indirect: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

const looseRecord = z.record(z.string(), z.unknown());

function pickNumber(...vals: Array<unknown>): number | null {
  for (const v of vals) {
    if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
    if (typeof v === "string" && v.trim() !== "") {
      // Floid CMF devuelve strings tipo "508443"; toleramos también "1.234,56" por las dudas.
      const n = Number(v.replace(/\./g, "").replace(",", "."));
      if (Number.isFinite(n)) return Math.round(n);
    }
  }
  return null;
}

function pickString(...vals: Array<unknown>): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return null;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function fmtCLP(n: number): string {
  return `$${n.toLocaleString("es-CL")}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Parsers de cada sección
// ──────────────────────────────────────────────────────────────────────────────

function parseSpSection(spRoot: unknown): SpRentaImponibleSection | null {
  const sp = asRecord(spRoot);
  if (!sp) return null;
  const r = asRecord(sp.renta_imponible);
  if (!r) return null;
  // Si Floid devolvió error en SP (`code != "200"`), retornamos null para que
  // el llamador capture el error vía `parseSectionError`.
  if (r.code !== undefined && String(r.code) !== "200") return null;
  return {
    remuneracion: pickNumber(r.remuneracion),
    mesesCotizados: pickNumber(r.meses_cotizados),
    period: pickString(r.period),
    moneda: pickString(r.moneda),
    fuente: pickString(r.fuente),
    fechaConsulta: pickString(r.fecha_consulta),
  };
}

/**
 * Extrae el error de una sub-sección si Floid lo reportó.
 * Devuelve null si la sección no tiene error o no existe.
 */
function parseSectionError(
  sectionRoot: unknown,
  subKey: string
): SectionError | null {
  const root = asRecord(sectionRoot);
  if (!root) return null;
  const sub = asRecord(root[subKey]);
  if (!sub) return null;
  const code = sub.code;
  if (code === undefined || String(code) === "200") return null;
  return {
    code: String(code),
    errorCode: pickString(sub.error_code),
    message:
      pickString(sub.display_message, sub.error_message) ??
      "Error sin descripción",
  };
}

/**
 * Acepta booleano o string ("SI"/"NO", "TRUE"/"FALSE") — el SII a veces devuelve
 * cualquiera de los dos según el shape de la carpeta tributaria.
 */
function parseFlexBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const u = v.trim().toUpperCase();
    return u === "SI" || u === "TRUE" || u === "YES" || u === "1";
  }
  return false;
}

function parseBienesRaices(arr: unknown): { items: BienRaiz[]; totalAvaluo: number } {
  const items: BienRaiz[] = [];
  let total = 0;
  for (const raw of asArray(arr)) {
    const r = asRecord(raw);
    if (!r) continue;
    const avaluo = pickNumber(r.avaluo_fiscal);
    if (avaluo !== null) total += avaluo;
    items.push({
      comuna: pickString(r.comuna),
      rol: pickString(r.rol),
      direccion: pickString(r.direccion),
      destino: pickString(r.destino),
      avaluoFiscal: avaluo,
      // Shape nuevo: `cuotas_vencidas_por_pagar: "NO"`. Shape viejo: `cuotas_vencidas: false`.
      cuotasVencidas: parseFlexBool(r.cuotas_vencidas_por_pagar ?? r.cuotas_vencidas),
      cuotasVigentes: parseFlexBool(r.cuotas_vigentes_por_pagar ?? r.cuotas_vigentes),
      condicion: pickString(r.condicion),
    });
  }
  return { items, totalAvaluo: total };
}

function parseParticipacionSociedades(arr: unknown): ParticipacionSociedad[] {
  const out: ParticipacionSociedad[] = [];
  for (const raw of asArray(arr)) {
    const r = asRecord(raw);
    if (!r) continue;
    const rut = pickString(r.rut);
    const razonSocial = pickString(r.razon_social, r.razonSocial);
    const fechaIncorporacion = pickString(r.fecha_incorporacion, r.fechaIncorporacion);
    if (!rut && !razonSocial) continue;
    out.push({ rut, razonSocial, fechaIncorporacion });
  }
  return out;
}

function parseStringArray(arr: unknown): string[] {
  const out: string[] = [];
  for (const v of asArray(arr)) {
    const s = pickString(v);
    if (s) out.push(s);
  }
  return out;
}

function parseSiiSection(siiRoot: unknown): SiiCarpetaTributariaSection | null {
  const sii = asRecord(siiRoot);
  if (!sii) return null;
  const ct = asRecord(sii.carpeta_tributaria);
  if (!ct) return null;
  // Si Floid devolvió error en SII (`code != "200"`), el llamador toma este null
  // y captura el error vía `parseSectionError`.
  if (ct.code !== undefined && String(ct.code) !== "200") return null;
  const data = asRecord(ct.data);
  if (!data) return null;

  const dc = asRecord(data.datos_contribuyente) ?? {};

  // Actividades económicas — shape NUEVO: array `actividades_economicas`.
  //                         shape VIEJO: string singular `actividad_economia`.
  const actividadesEconomicas = parseStringArray(dc.actividades_economicas);
  if (actividadesEconomicas.length === 0) {
    const single = pickString(dc.actividad_economia);
    if (single) actividadesEconomicas.push(single);
  }

  // Detalle con códigos. NUEVO: `actividades_economicas_detalle` (plural).
  //                     VIEJO: `actividad_economia_detalle` (singular).
  const detalleRaw = asArray(
    dc.actividades_economicas_detalle ?? dc.actividad_economia_detalle
  );
  const detalle: Array<{ codigo: string; descripcion: string }> = [];
  for (const item of detalleRaw) {
    const r = asRecord(item);
    if (!r) continue;
    const codigo = pickString(r.codigo);
    const descripcion = pickString(r.descripcion);
    if (codigo && descripcion) detalle.push({ codigo, descripcion });
  }

  const bienesRaices = parseBienesRaices(data.bienes_raices);
  const { f22ByYear, f22Years, latestF22 } = parseF22(data.F22);

  return {
    nombreEmisor: pickString(data.nombre_emisor),
    rutEmisor: pickString(data.rut_emisor),
    fechaInicioActividades: pickString(dc.fecha_inicio_actividades),
    actividadesEconomicas,
    actividadEconomica: actividadesEconomicas[0] ?? null,
    actividadEconomicaDetalle: detalle,
    categoriaTributaria: pickString(dc.categoria_tributaria),
    domicilio: pickString(dc.domicilio),
    sucursal: pickString(dc.sucursal),
    observacionesTributarias: pickString(dc.observaciones_tributarias),
    ultimosDocumentosTimbrados: parseStringArray(dc.ultimos_documentos_timbrados),
    participacionSociedades: parseParticipacionSociedades(dc.participacion_sociedades),
    representantesLegales: parseStringArray(dc.representantes_legales),
    bienesRaices: bienesRaices.items,
    totalAvaluoFiscal: bienesRaices.totalAvaluo,
    cantidadBienesRaices: bienesRaices.items.length,
    boletasHonorariosCount: asArray(data.boletas_honorarios).length,
    f22Years,
    f22ByYear,
    latestF22,
  };
}

/** Códigos clave del F22 mapeados a labels amigables (no exhaustivo). */
const F22_KNOWN_CODES: Record<string, string> = {
  "170": "Renta líquida imponible (total)",
  "1098": "Base imponible global complementario",
  "158": "Impuestos personales (total)",
  "157": "Renta presunta",
  "161": "Renta efectiva",
  "162": "Crédito por gastos",
  "304": "Diferencia (saldo)",
  "305": "Devolución",
  "31": "Reajuste",
  "91": "Pagos provisionales mensuales (PPM)",
  "110": "Crédito personal",
  "461": "Renta imponible total",
  "547": "Renta líquida imponible",
  "618": "Crédito por inversiones",
  "619": "Otros créditos",
  "645": "Crédito al exterior",
  "646": "Otros créditos al exterior",
  "8811": "Moneda de declaración",
};

export function f22CodeLabel(codigo: string): string | null {
  return F22_KNOWN_CODES[codigo] ?? null;
}

/**
 * F22 viene en dos shapes según el contrato/widget de Floid:
 *
 * Shape A (NUEVO, observado 2026-05-11 en widget `250c7fa8...`):
 *   F22: { by_year: [ { year: "2024", data: { "170": { name, value, number } } } ] }
 *
 * Shape B (VIEJO, observado en widget `e5dc95a4...`):
 *   F22: { "2024": { codigos: { "170": "value" }, glosa: { "170": "value" } } }
 */
function parseF22(raw: unknown): {
  f22ByYear: Record<string, F22YearData>;
  f22Years: string[];
  latestF22: F22Highlights | null;
} {
  const root = asRecord(raw) ?? {};
  const out: Record<string, F22YearData> = {};

  // Shape A: F22.by_year es array
  if (Array.isArray(root.by_year)) {
    for (const item of root.by_year) {
      const r = asRecord(item);
      if (!r) continue;
      const year = pickString(r.year);
      const dataRaw = asRecord(r.data);
      if (!year || !dataRaw) continue;
      const codigos: Record<string, string> = {};
      for (const [code, payload] of Object.entries(dataRaw)) {
        const p = asRecord(payload);
        if (p) {
          // Shape detallado: { name, value, number }
          const value = pickString(p.value);
          if (value !== null) codigos[code] = value;
        } else if (typeof payload === "string") {
          codigos[code] = payload;
        }
      }
      out[year] = { year, codigos, glosa: codigos };
    }
  } else {
    // Shape B: dict por año
    for (const [year, payload] of Object.entries(root)) {
      const yp = asRecord(payload);
      if (!yp) continue;
      const codigos = asRecord(yp.codigos) ?? {};
      const glosa = asRecord(yp.glosa) ?? {};
      out[year] = {
        year,
        codigos: stringifyRecord(codigos),
        glosa: stringifyRecord(glosa),
      };
    }
  }

  const years = Object.keys(out).sort();
  const latestYear = years[years.length - 1];
  const latestF22: F22Highlights | null = latestYear
    ? {
        year: latestYear,
        rentaLiquidaImponible: pickNumber(out[latestYear].codigos["170"]),
        baseImponible: pickNumber(out[latestYear].codigos["1098"]),
        totalImpuesto: pickNumber(out[latestYear].codigos["158"]),
        diferencia: pickNumber(out[latestYear].codigos["304"]),
        devolucion: pickNumber(out[latestYear].codigos["305"]),
      }
    : null;
  return { f22ByYear: out, f22Years: years, latestF22 };
}

function stringifyRecord(o: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === "string") out[k] = v;
    else if (typeof v === "number") out[k] = String(v);
    else if (v != null) out[k] = String(v);
  }
  return out;
}

function parseDebtArray(arr: unknown): DebtItem[] {
  const out: DebtItem[] = [];
  for (const raw of asArray(arr)) {
    const r = asRecord(raw);
    if (!r) continue;
    const institution = pickString(r.institution);
    if (!institution) continue;
    out.push({
      institution,
      currentDebt: pickNumber(r.currentDebt) ?? 0,
      between30To89Days: pickNumber(r.between30To89Days) ?? 0,
      over90Days: pickNumber(r.over90Days) ?? 0,
      total: pickNumber(r.total) ?? 0,
    });
  }
  return out;
}

function parseCreditLines(arr: unknown): CreditLine[] {
  const out: CreditLine[] = [];
  for (const raw of asArray(arr)) {
    const r = asRecord(raw);
    if (!r) continue;
    const institution = pickString(r.institution);
    if (!institution) continue;
    out.push({
      institution,
      direct: pickNumber(r.direct) ?? 0,
      indirect: pickNumber(r.indirect) ?? 0,
    });
  }
  return out;
}

function parseCmfSection(cmfRoot: unknown): CmfDeudaSection | null {
  const cmf = asRecord(cmfRoot);
  if (!cmf) return null;
  const deuda = asRecord(cmf.deuda);
  if (!deuda) return null;
  const data = asRecord(deuda.data);
  if (!data) return null;

  const directDebt = parseDebtArray(data.directDebt);
  const indirectDebt = parseDebtArray(data.indirectDebt);
  const credits = asRecord(data.credits) ?? {};
  const creditLines = parseCreditLines(credits.lines);

  const sum = (arr: DebtItem[], key: keyof DebtItem): number =>
    arr.reduce((acc, item) => acc + (typeof item[key] === "number" ? (item[key] as number) : 0), 0);

  const totalDirectDebt = sum(directDebt, "total");
  const totalIndirectDebt = sum(indirectDebt, "total");
  const totalDebt30To89 = sum(directDebt, "between30To89Days") + sum(indirectDebt, "between30To89Days");
  const totalDebt90Plus = sum(directDebt, "over90Days") + sum(indirectDebt, "over90Days");
  const totalLinesDirect = creditLines.reduce((a, l) => a + l.direct, 0);
  const totalLinesIndirect = creditLines.reduce((a, l) => a + l.indirect, 0);

  const institutionsSet = new Set<string>();
  for (const d of [...directDebt, ...indirectDebt]) institutionsSet.add(d.institution);
  for (const l of creditLines) institutionsSet.add(l.institution);

  return {
    name: pickString(data.name),
    rut: pickString(data.rut),
    updated: pickString(data.updated),
    directDebt,
    indirectDebt,
    creditLines,
    totalDirectDebt,
    totalIndirectDebt,
    totalDebt: totalDirectDebt + totalIndirectDebt,
    totalDebt30To89,
    totalDebt90Plus,
    totalLinesDirect,
    totalLinesIndirect,
    institutions: Array.from(institutionsSet).sort(),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Summary generator
// ──────────────────────────────────────────────────────────────────────────────

function buildSummary(
  consumerId: string | null,
  sp: SpRentaImponibleSection | null,
  sii: SiiCarpetaTributariaSection | null,
  cmf: CmfDeudaSection | null
): string {
  const parts: string[] = [];

  // Identificación
  const identidad = sii?.nombreEmisor ?? cmf?.name ?? null;
  if (identidad) {
    parts.push(`${identidad}${consumerId ? ` (${consumerId})` : ""}.`);
  } else if (consumerId) {
    parts.push(`RUT ${consumerId}.`);
  }

  // Renta mensual (SP)
  if (sp?.remuneracion) {
    parts.push(`Renta imponible mensual: ${fmtCLP(sp.remuneracion)}.`);
  }

  // Renta declarada anual (SII F22)
  if (sii?.latestF22) {
    const rli = sii.latestF22.rentaLiquidaImponible;
    const bi = sii.latestF22.baseImponible;
    const monto = rli ?? bi;
    if (monto) {
      parts.push(
        `Renta declarada ${sii.latestF22.year}: ${fmtCLP(monto)} (${rli ? "renta líquida imponible" : "base imponible"}).`
      );
    }
  }

  // CMF — deuda + morosidad
  if (cmf) {
    const moroso = cmf.totalDebt30To89 + cmf.totalDebt90Plus;
    const mora = moroso > 0 ? ` (con ${fmtCLP(moroso)} en mora)` : " (sin morosidad)";
    parts.push(
      `Deuda total: ${fmtCLP(cmf.totalDebt)}${mora}; líneas disponibles: ${fmtCLP(cmf.totalLinesDirect + cmf.totalLinesIndirect)}.`
    );
  }

  // SII — patrimonio
  if (sii && sii.cantidadBienesRaices > 0) {
    parts.push(
      `${sii.cantidadBienesRaices} bien${sii.cantidadBienesRaices === 1 ? "" : "es"} raíz por avalúo fiscal ${fmtCLP(sii.totalAvaluoFiscal)}.`
    );
  }

  return parts.join(" ") || "Reporte recibido sin secciones interpretables.";
}

// ──────────────────────────────────────────────────────────────────────────────
// API pública
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Parsea el payload del widget Floid en un reporte estructurado.
 * Devuelve `null` si el payload no parece un reporte (e.g. ack inicial o error).
 */
export function parseFloidWidgetPayload(payload: unknown): FloidWidgetReport | null {
  const parsed = looseRecord.safeParse(payload);
  if (!parsed.success) return null;
  const o = parsed.data;

  // Heurística: el widget productivo trae al menos una de SP/SII/CMF.
  const hasSp = asRecord(o.SP) !== null;
  const hasSii = asRecord(o.SII) !== null;
  const hasCmf = asRecord(o.CMF) !== null;
  if (!hasSp && !hasSii && !hasCmf) return null;

  const sp = parseSpSection(o.SP);
  const sii = parseSiiSection(o.SII);
  const cmf = parseCmfSection(o.CMF);

  // Errores por sección (cuando Floid devolvió code != 200 para esa sub-sección)
  const errors: ReportErrors = {};
  if (hasSp) {
    const e = parseSectionError(o.SP, "renta_imponible");
    if (e) errors.sp = e;
  }
  if (hasSii) {
    const e = parseSectionError(o.SII, "carpeta_tributaria");
    if (e) errors.sii = e;
  }
  if (hasCmf) {
    const e = parseSectionError(o.CMF, "deuda");
    if (e) errors.cmf = e;
  }

  // `partial` cuando Floid marcó el payload top-level como 206 o cualquier
  // sección tiene error reportado.
  const topCode = typeof o.code === "number" ? o.code : pickNumber(o.code);
  const partial = topCode === 206 || Object.keys(errors).length > 0;

  const consumerId = pickString(o.consumerId);
  const caseid = pickString(o.caseid, o.caseId, o.case_id);
  const custom = pickString(o.custom);
  const downloadPdfUrl = pickString(o.download_pdf, o.downloadPdfUrl);

  return {
    consumerId,
    caseid,
    custom,
    downloadPdfUrl,
    summary: buildSummary(consumerId, sp, sii, cmf),
    sp,
    sii,
    cmf,
    errors,
    partial,
    rawResponse: o,
  };
}

/**
 * True si el payload parece un acuse asíncrono (no es el reporte final).
 * Se mantiene para compatibilidad con flujos REST async (no widget).
 */
export function looksLikeFloidAsyncAck(payload: unknown): boolean {
  const parsed = looseRecord.safeParse(payload);
  if (!parsed.success) return false;
  const o = parsed.data;
  // Si parsea como widget report, no es un ack.
  if (parseFloidWidgetPayload(payload) !== null) return false;
  const code = pickString(o.code, o.status);
  const hasCase = pickString(o.caseid, o.caseId, o.case_id);
  // 202 es ack típico (e.g. "2fa_required").
  return Boolean(code === "200" || code === "202" || hasCase);
}
