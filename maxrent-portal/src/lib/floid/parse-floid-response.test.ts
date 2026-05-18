/**
 * Tests del parser del Floid Widget.
 * Casos basados en payloads reales capturados en producción 2026-04-28.
 *
 * @see parseFloidWidgetPayload
 */

import { describe, it, expect } from "vitest";
import {
  looksLikeFloidAsyncAck,
  parseFloidWidgetPayload,
} from "./parse-floid-response";

describe("parseFloidWidgetPayload", () => {
  it("returns null for null/undefined/non-object inputs", () => {
    expect(parseFloidWidgetPayload(null)).toBeNull();
    expect(parseFloidWidgetPayload(undefined)).toBeNull();
    expect(parseFloidWidgetPayload("ok")).toBeNull();
    expect(parseFloidWidgetPayload(42)).toBeNull();
  });

  it("returns null when payload has no SP/SII/CMF sections", () => {
    expect(parseFloidWidgetPayload({})).toBeNull();
    expect(parseFloidWidgetPayload({ code: 200, msg: "OK", caseid: "x" })).toBeNull();
  });

  it("parses a payload with all 3 sections (SP + SII + CMF)", () => {
    const payload = {
      code: 200,
      message: "OK",
      consumerId: "12345678-9",
      caseid: "case-global",
      custom: "eval-001",
      download_pdf: "https://admin.floid.app/pdf?token=abc",
      SP: {
        renta_imponible: {
          period: "202603",
          remuneracion: 1500000,
          meses_cotizados: 12,
          moneda: "CLP",
          fuente: "Sup. Pensiones",
          fecha_consulta: "2026-04-28",
        },
      },
      SII: {
        carpeta_tributaria: {
          data: {
            tipo: "ACREDITAR RENTA",
            nombre_emisor: "Persona Demo",
            rut_emisor: "12345678-9",
            datos_contribuyente: {
              fecha_inicio_actividades: "01/01/2015",
              actividad_economia: "ACTIVIDAD DEMO",
              actividad_economia_detalle: [
                { codigo: "100100", descripcion: "DEMO ACTIVITY" },
              ],
              categoria_tributaria: "Primera Categoría",
              domicilio: "AVENIDA DEMO 123, COMUNA",
              sucursal: "",
              ultimos_documentos_timbrados: ["Boleta Honorarios (01/01/2020)"],
              observaciones_tributarias: "No tiene observaciones",
            },
            bienes_raices: [
              {
                comuna: "PROVIDENCIA",
                rol: "0123-456",
                direccion: "CALLE DEMO 100",
                destino: "HABITACIONAL",
                avaluo_fiscal: 50000000,
                cuotas_vencidas: false,
                cuotas_vigentes: false,
                condicion: "AFECTO",
              },
              {
                comuna: "ÑUÑOA",
                rol: "0789-012",
                direccion: "OTRA CALLE 200",
                destino: "HABITACIONAL",
                avaluo_fiscal: 80000000,
                cuotas_vencidas: false,
                cuotas_vigentes: false,
                condicion: "AFECTO",
              },
            ],
            boletas_honorarios: [],
            F22: {
              "2024": {
                glosa: { "170": "10000000" },
                codigos: { "170": "10000000", "1098": "9900000", "158": "500000" },
              },
              "2025": {
                glosa: { "170": "12000000" },
                codigos: {
                  "170": "12000000",
                  "1098": "11900000",
                  "158": "600000",
                  "304": "10000",
                  "305": "20000",
                },
              },
            },
          },
        },
      },
      CMF: {
        deuda: {
          data: {
            name: "Persona Demo",
            rut: "12345678-9",
            updated: "2026-04-17",
            directDebt: [
              {
                institution: "Banco Demo",
                currentDebt: "1000000",
                between30To89Days: "0",
                over90Days: "0",
                total: "1000000",
              },
              {
                institution: "Banco Otro",
                currentDebt: "500000",
                between30To89Days: "100000",
                over90Days: "0",
                total: "600000",
              },
            ],
            indirectDebt: [
              {
                institution: "Banco Demo",
                currentDebt: "200000",
                between30To89Days: "0",
                over90Days: "50000",
                total: "250000",
              },
            ],
            credits: {
              lines: [
                { institution: "Banco Demo", direct: "5000000", indirect: "0" },
                { institution: "Banco Otro", direct: "3000000", indirect: "0" },
              ],
              others: [],
            },
          },
        },
      },
    };

    const r = parseFloidWidgetPayload(payload);
    expect(r).not.toBeNull();
    if (!r) throw new Error("expected report");

    // Identificación + summary
    expect(r.consumerId).toBe("12345678-9");
    expect(r.caseid).toBe("case-global");
    expect(r.custom).toBe("eval-001");
    expect(r.downloadPdfUrl).toBe("https://admin.floid.app/pdf?token=abc");
    expect(r.summary).toContain("Persona Demo");
    expect(r.summary).toContain("12345678-9");

    // SP
    expect(r.sp?.remuneracion).toBe(1500000);
    expect(r.sp?.mesesCotizados).toBe(12);
    expect(r.sp?.period).toBe("202603");

    // SII
    expect(r.sii?.nombreEmisor).toBe("Persona Demo");
    expect(r.sii?.cantidadBienesRaices).toBe(2);
    expect(r.sii?.totalAvaluoFiscal).toBe(130000000);
    expect(r.sii?.actividadEconomicaDetalle).toHaveLength(1);
    expect(r.sii?.f22Years).toEqual(["2024", "2025"]);
    expect(r.sii?.boletasHonorariosCount).toBe(0);

    // F22 estructurado
    expect(r.sii?.f22ByYear["2024"]?.codigos["170"]).toBe("10000000");
    expect(r.sii?.f22ByYear["2025"]?.codigos["304"]).toBe("10000");

    // F22 highlights del año más reciente (2025)
    expect(r.sii?.latestF22?.year).toBe("2025");
    expect(r.sii?.latestF22?.rentaLiquidaImponible).toBe(12000000);
    expect(r.sii?.latestF22?.baseImponible).toBe(11900000);
    expect(r.sii?.latestF22?.totalImpuesto).toBe(600000);
    expect(r.sii?.latestF22?.diferencia).toBe(10000);
    expect(r.sii?.latestF22?.devolucion).toBe(20000);

    // Summary debería mencionar la renta declarada
    expect(r.summary).toContain("Renta declarada 2025");

    // CMF — totales calculados
    expect(r.cmf?.directDebt).toHaveLength(2);
    expect(r.cmf?.indirectDebt).toHaveLength(1);
    expect(r.cmf?.totalDirectDebt).toBe(1600000); // 1M + 600K
    expect(r.cmf?.totalIndirectDebt).toBe(250000);
    expect(r.cmf?.totalDebt).toBe(1850000);
    expect(r.cmf?.totalDebt30To89).toBe(100000); // solo en directa
    expect(r.cmf?.totalDebt90Plus).toBe(50000); // solo en indirecta
    expect(r.cmf?.totalLinesDirect).toBe(8000000);
    expect(r.cmf?.totalLinesIndirect).toBe(0);
    expect(r.cmf?.institutions).toEqual(["Banco Demo", "Banco Otro"]);
    expect(r.cmf?.updated).toBe("2026-04-17");

    // rawResponse preservado
    expect(r.rawResponse).toEqual(payload);
  });

  it("parses a payload with only CMF (productos parciales)", () => {
    const payload = {
      code: 200,
      consumerId: "12345678-9",
      custom: "eval-002",
      CMF: {
        deuda: {
          data: {
            name: "Demo",
            rut: "12345678-9",
            updated: "2026-04-17",
            directDebt: [],
            indirectDebt: [],
            credits: { lines: [], others: [] },
          },
        },
      },
    };

    const r = parseFloidWidgetPayload(payload);
    expect(r).not.toBeNull();
    expect(r?.sp).toBeNull();
    expect(r?.sii).toBeNull();
    expect(r?.cmf?.totalDebt).toBe(0);
  });

  it("tolerates string-encoded numbers in CMF (Floid devuelve strings)", () => {
    const payload = {
      consumerId: "12345678-9",
      custom: "eval-003",
      CMF: {
        deuda: {
          data: {
            directDebt: [
              {
                institution: "X",
                currentDebt: "1.234.567",
                between30To89Days: "0",
                over90Days: "0",
                total: "1.234.567",
              },
            ],
            indirectDebt: [],
            credits: { lines: [], others: [] },
          },
        },
      },
    };
    const r = parseFloidWidgetPayload(payload);
    expect(r?.cmf?.totalDirectDebt).toBe(1234567);
  });

  it("parses NEW SII shape with actividades_economicas (array) + participacion_sociedades + F22.by_year + cuotas_por_pagar", () => {
    const payload = {
      code: 206,
      consumerId: "15782800-2",
      custom: "eval-new-shape",
      SII: {
        carpeta_tributaria: {
          code: "200",
          data: {
            rut_emisor: "15782800-2",
            nombre_emisor: "DEMO PERSONA",
            datos_contribuyente: {
              fecha_inicio_actividades: "20-12-2007",
              actividades_economicas: [
                "SERVICIOS DE INGENIERIA Y FONDOS DE INVERSION",
              ],
              actividades_economicas_detalle: [
                { codigo: "643000", descripcion: "FONDOS Y SOCIEDADES" },
                { codigo: "711003", descripcion: "INGENIERIA" },
              ],
              categoria_tributaria: "Primera Categoría",
              domicilio: "AVDA. DEMO 123, SANTIAGO",
              observaciones_tributarias: "No tiene observaciones.",
              representantes_legales: [],
              participacion_sociedades: [
                {
                  rut: "76116108-3",
                  razon_social: "COIHUE LTDA",
                  fecha_incorporacion: "07-10-2010",
                },
                {
                  rut: "77110413-4",
                  razon_social: "INVERSIONES CALIFORNIA SPA",
                  fecha_incorporacion: "31-12-2019",
                },
              ],
              ultimos_documentos_timbrados: ["Boletas Honorarios (23-06-2017)"],
            },
            bienes_raices: [
              {
                rol: "0363000017",
                comuna: "LO BARNECHEA",
                destino: "HABITACIONAL",
                condicion: "AFECTO",
                direccion: "DIRECCION DEMO",
                avaluo_fiscal: 351234255,
                cuotas_vencidas_por_pagar: "NO",
                cuotas_vigentes_por_pagar: "NO",
              },
            ],
            F22: {
              by_year: [
                {
                  year: "2025",
                  data: {
                    "170": {
                      name: "Renta Líquida Imponible",
                      value: "181738945",
                      number: 170,
                    },
                    "1098": { name: "Base", value: "181693829", number: 1098 },
                    "304": { name: "Diferencia", value: "-15.239", number: 304 },
                  },
                },
              ],
            },
            boletas_honorarios: [],
          },
        },
      },
    };

    const r = parseFloidWidgetPayload(payload);
    expect(r).not.toBeNull();
    if (!r) throw new Error("expected report");

    // Actividades plural
    expect(r.sii?.actividadesEconomicas).toHaveLength(1);
    expect(r.sii?.actividadEconomica).toBe("SERVICIOS DE INGENIERIA Y FONDOS DE INVERSION");
    expect(r.sii?.actividadEconomicaDetalle).toHaveLength(2);
    expect(r.sii?.actividadEconomicaDetalle[0]?.codigo).toBe("643000");

    // Sociedades
    expect(r.sii?.participacionSociedades).toHaveLength(2);
    expect(r.sii?.participacionSociedades[0]?.razonSocial).toBe("COIHUE LTDA");

    // Bienes raíces: cuotas SI/NO como string deben mapear a boolean
    expect(r.sii?.bienesRaices[0]?.cuotasVencidas).toBe(false);
    expect(r.sii?.bienesRaices[0]?.cuotasVigentes).toBe(false);

    // F22 by_year shape (NUEVO) debe parsear correctamente
    expect(r.sii?.f22Years).toEqual(["2025"]);
    expect(r.sii?.f22ByYear["2025"]?.codigos["170"]).toBe("181738945");
    expect(r.sii?.latestF22?.rentaLiquidaImponible).toBe(181738945);
    expect(r.sii?.latestF22?.baseImponible).toBe(181693829);

    // Payload top-level 206 → partial=true
    expect(r.partial).toBe(true);
  });

  it("captura errores parciales por sección con code != 200", () => {
    const payload = {
      code: 206,
      consumerId: "12345678-9",
      custom: "eval-error",
      SP: {
        renta_imponible: {
          code: 400,
          error_code: "SERVICE_UNAVAILABLE",
          error_message: "The service is unavailable",
          display_message: "El servicio no está disponible",
        },
      },
      SII: {
        carpeta_tributaria: {
          code: "200",
          data: {
            rut_emisor: "12345678-9",
            nombre_emisor: "DEMO",
            datos_contribuyente: {},
            bienes_raices: [],
            boletas_honorarios: [],
            F22: {},
          },
        },
      },
    };

    const r = parseFloidWidgetPayload(payload);
    expect(r).not.toBeNull();
    expect(r?.sp).toBeNull(); // sección con error retorna null
    expect(r?.errors.sp?.code).toBe("400");
    expect(r?.errors.sp?.errorCode).toBe("SERVICE_UNAVAILABLE");
    expect(r?.errors.sp?.message).toBe("El servicio no está disponible");
    expect(r?.sii).not.toBeNull(); // sección OK se parsea normal
    expect(r?.partial).toBe(true);
  });

  it("morosidad >0 se refleja en summary", () => {
    const payload = {
      consumerId: "12345678-9",
      custom: "eval-004",
      CMF: {
        deuda: {
          data: {
            directDebt: [
              {
                institution: "X",
                currentDebt: "0",
                between30To89Days: "100000",
                over90Days: "0",
                total: "100000",
              },
            ],
            indirectDebt: [],
            credits: { lines: [], others: [] },
          },
        },
      },
    };
    const r = parseFloidWidgetPayload(payload);
    expect(r?.summary).toContain("mora");
  });

  it("payload 'todo fallido' (INVALID_CONTRACT) → secciones null + errors populadas", () => {
    // Caso real producción 2026-05-18 (cliente Benjamín Labra): el contrato
    // MaxRent↔Floid quedó desactivado en Floid → cada sección viene con
    // code: 400 + error_code: INVALID_CONTRACT, y el code global también es
    // 400. El parser debe devolver sp/sii/cmf = null y poblar errors para que
    // el service marque la evaluación como FAILED (no COMPLETED).
    const payload = {
      code: 400,
      message: "Service unavailable",
      caseid: "71ac1d29-c163-4ba5-92ec-149417a08aeb",
      custom: "cmpaz12g50003jp0471inj1mx",
      consumerId: "16096105-8",
      download_pdf: "https://admin.floid.app/pdf_generator?url=...",
      SP: {
        renta_imponible: {
          code: 400,
          error_code: "INVALID_CONTRACT",
          error_message: "El contrato asociado a este Token está desactivado",
          display_message:
            "The contract associated with this Token is deactivated",
        },
      },
      SII: {
        carpeta_tributaria: {
          code: 400,
          error_code: "INVALID_CONTRACT",
          error_message: "El contrato asociado a este Token está desactivado",
          display_message:
            "The contract associated with this Token is deactivated",
        },
      },
    };
    const r = parseFloidWidgetPayload(payload);
    expect(r).not.toBeNull();
    expect(r?.sp).toBeNull();
    expect(r?.sii).toBeNull();
    expect(r?.cmf).toBeNull();
    expect(r?.errors.sp?.errorCode).toBe("INVALID_CONTRACT");
    expect(r?.errors.sii?.errorCode).toBe("INVALID_CONTRACT");
    expect(r?.partial).toBe(true);
  });
});

describe("looksLikeFloidAsyncAck", () => {
  it("true para ack 200/202 sin secciones", () => {
    expect(
      looksLikeFloidAsyncAck({ code: "200", msg: "OK", caseid: "x" })
    ).toBe(true);
    expect(
      looksLikeFloidAsyncAck({ code: "202", msg: "2fa_required", caseid: "x" })
    ).toBe(true);
  });

  it("false cuando es un reporte completo (tiene secciones)", () => {
    expect(
      looksLikeFloidAsyncAck({
        consumerId: "x",
        custom: "y",
        CMF: { deuda: { data: { directDebt: [], indirectDebt: [], credits: { lines: [], others: [] } } } },
      })
    ).toBe(false);
  });

  it("false para basura", () => {
    expect(looksLikeFloidAsyncAck(null)).toBe(false);
    expect(looksLikeFloidAsyncAck({})).toBe(false);
  });
});
