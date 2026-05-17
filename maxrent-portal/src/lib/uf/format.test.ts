import { describe, expect, it } from "vitest";
import {
  convertUfToClp,
  formatClpNumber,
  formatUfClpHint,
  formatUfRateAsOf,
} from "./format";

describe("convertUfToClp", () => {
  it("multiplica y redondea al peso entero más cercano", () => {
    expect(convertUfToClp(1, 39458.12)).toBe(39458);
    expect(convertUfToClp(2, 39458.12)).toBe(78916);
    expect(convertUfToClp(5070, 39458.12)).toBe(200052668);
  });

  it("redondea hacia arriba en .5", () => {
    expect(convertUfToClp(1, 100.5)).toBe(101);
    expect(convertUfToClp(1, 100.4)).toBe(100);
  });

  it("lanza si los argumentos no son finitos", () => {
    expect(() => convertUfToClp(Number.NaN, 39000)).toThrow();
    expect(() => convertUfToClp(1, Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe("formatClpNumber", () => {
  it("formatea con separador chileno y signo $", () => {
    expect(formatClpNumber(1234567)).toBe("$1.234.567");
    expect(formatClpNumber(0)).toBe("$0");
  });

  it("devuelve em-dash para valores no finitos", () => {
    expect(formatClpNumber(Number.NaN)).toBe("—");
    expect(formatClpNumber(Number.POSITIVE_INFINITY)).toBe("—");
  });
});

describe("formatUfClpHint", () => {
  it("devuelve hint con ≈ cuando hay UF y valor", () => {
    expect(formatUfClpHint(5070, 39458.12)).toBe("≈ $200.052.668 CLP");
    expect(formatUfClpHint("5070", 39458.12)).toBe("≈ $200.052.668 CLP");
  });

  it("devuelve null si no hay UF cacheada", () => {
    expect(formatUfClpHint(5070, null)).toBeNull();
    expect(formatUfClpHint("5070", null)).toBeNull();
  });

  it("devuelve null si el valor UF es null", () => {
    expect(formatUfClpHint(null, 39458.12)).toBeNull();
  });

  it("devuelve null si el valor UF es no parseable", () => {
    expect(formatUfClpHint("abc", 39458.12)).toBeNull();
  });

  it("devuelve null si la UF cacheada es no finita", () => {
    expect(formatUfClpHint(5070, Number.NaN)).toBeNull();
  });
});

describe("formatUfRateAsOf", () => {
  it("formatea fecha YYYY-MM-DD a estilo 13-may-2026", () => {
    expect(formatUfRateAsOf("2026-05-13")).toBe("UF al 13-may-2026");
    expect(formatUfRateAsOf("2025-01-01")).toBe("UF al 1-ene-2025");
  });

  it("devuelve null si la fecha es null o malformada", () => {
    expect(formatUfRateAsOf(null)).toBeNull();
    // Mes fuera de rango (>12) devuelve null porque meses[m-1] es undefined.
    expect(formatUfRateAsOf("2026-13-01")).toBeNull();
    expect(formatUfRateAsOf("2026-99-01")).toBeNull();
    expect(formatUfRateAsOf("abc")).toBeNull();
    // Formato sin 3 partes
    expect(formatUfRateAsOf("2026-05")).toBeNull();
  });
});
