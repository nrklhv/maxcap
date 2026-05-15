/**
 * Tests de los helpers PUROS del service de AVLA (sin HTTP, sin Prisma).
 *
 * Lo que NO testeamos acá (queda para integración manual con sandbox real):
 *   - login / logout
 *   - flujo end-to-end de checkPreapproval
 *
 * Sí cubrimos:
 *   - Normalización de RUT
 *   - Extracción de stateTags (combinando `stateTags` raíz + `stateDto.tags`)
 *   - Predicado de preaprobación
 *   - Detección de rechazo automático
 */

import { describe, expect, it } from "vitest";
import {
  extractStateTags,
  formatRutForAvla,
  isPreapprovedFromTags,
  isRejected,
} from "./avla.service";

describe("formatRutForAvla", () => {
  it("normaliza con puntos y guion", () => {
    expect(formatRutForAvla("12.345.678-9")).toBe("CL123456789");
  });

  it("normaliza sin puntos", () => {
    expect(formatRutForAvla("12345678-9")).toBe("CL123456789");
  });

  it("acepta DV K", () => {
    expect(formatRutForAvla("12345678-K")).toBe("CL12345678K");
    expect(formatRutForAvla("12345678-k")).toBe("CL12345678K");
  });

  it("ignora prefijo CL si ya viene", () => {
    expect(formatRutForAvla("CL123456789")).toBe("CL123456789");
    expect(formatRutForAvla("cl12.345.678-9")).toBe("CL123456789");
  });

  it("rechaza RUT inválido", () => {
    expect(() => formatRutForAvla("abc")).toThrow(/inválido/);
    expect(() => formatRutForAvla("")).toThrow(/inválido/);
  });
});

describe("extractStateTags", () => {
  it("toma tags del nivel raíz `stateTags`", () => {
    expect(
      extractStateTags({ stateTags: ["waitingForResolution", "evaluatedLinePortal"] })
    ).toEqual(["waitingForResolution", "evaluatedLinePortal"]);
  });

  it("toma tag.name de `stateDto.tags`", () => {
    expect(
      extractStateTags({
        stateDto: {
          name: "X",
          tags: [{ name: "rejectedState" }, { name: "informableStatePortal" }],
        },
      })
    ).toEqual(["rejectedState", "informableStatePortal"]);
  });

  it("combina ambas fuentes deduplicando", () => {
    expect(
      extractStateTags({
        stateTags: ["a", "b"],
        stateDto: { tags: [{ name: "b" }, { name: "c" }] },
      })
    ).toEqual(["a", "b", "c"]);
  });

  it("devuelve [] si no hay tags", () => {
    expect(extractStateTags({})).toEqual([]);
    expect(extractStateTags({ stateDto: { name: "X" } })).toEqual([]);
  });
});

describe("isRejected", () => {
  it("detecta rejectedState", () => {
    expect(isRejected(["rejectedState"])).toBe(true);
    expect(isRejected(["foo", "rejectedState", "bar"])).toBe(true);
  });

  it("detecta automaticallyRejectedState", () => {
    expect(isRejected(["automaticallyRejectedState"])).toBe(true);
  });

  it("false si no hay tags de rechazo", () => {
    expect(isRejected([])).toBe(false);
    expect(isRejected(["waitingForResolution", "evaluatedLinePortal"])).toBe(false);
    expect(isRejected(["activeLineState", "saleLoadAllowed"])).toBe(false);
  });
});

describe("isPreapprovedFromTags", () => {
  it("true si los tags NO incluyen rechazo", () => {
    expect(isPreapprovedFromTags(["waitingForResolution"])).toBe(true);
    expect(isPreapprovedFromTags(["activeLineState"])).toBe(true);
    expect(isPreapprovedFromTags(["riskBackgroundCompilation", "reestudingLine"])).toBe(true);
  });

  it("false si los tags incluyen rechazo", () => {
    expect(isPreapprovedFromTags(["rejectedState"])).toBe(false);
    expect(isPreapprovedFromTags(["automaticallyRejectedState"])).toBe(false);
    expect(isPreapprovedFromTags(["waitingForResolution", "rejectedState"])).toBe(false);
  });

  it("null si no hay tags (caso raro)", () => {
    expect(isPreapprovedFromTags([])).toBe(null);
  });
});
