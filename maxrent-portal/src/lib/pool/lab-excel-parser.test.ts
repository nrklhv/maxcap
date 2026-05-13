import { describe, expect, it } from "vitest";
import {
  computePoolMetrics,
  parseLabExcelRows,
  type RawLabRow,
} from "./lab-excel-parser";

const CAP_RATE = 0.058;
const UF = 40000;

describe("parseLabExcelRows", () => {
  it("descarta filas sin Id", () => {
    const { units, discarded } = parseLabExcelRows(
      [
        { Id: null, "En Venta": "Si", "Valor Arriendo": 300000 } as RawLabRow,
        { Id: undefined, "En Venta": "Si", "Valor Arriendo": 300000 } as RawLabRow,
        { Id: "", "En Venta": "Si", "Valor Arriendo": 300000 } as RawLabRow,
      ],
      { capRateBruto: CAP_RATE, ufValueClp: UF }
    );
    expect(units).toHaveLength(0);
    expect(discarded.every((d) => d.reason === "sin Id")).toBe(true);
  });

  it("descarta filas que no están En Venta", () => {
    const { units, discarded } = parseLabExcelRows(
      [
        { Id: 1, "En Venta": "No", "Valor Arriendo": 300000 } as RawLabRow,
        { Id: 2, "En Venta": null, "Valor Arriendo": 300000 } as RawLabRow,
      ],
      { capRateBruto: CAP_RATE, ufValueClp: UF }
    );
    expect(units).toHaveLength(0);
    expect(discarded).toHaveLength(2);
    expect(discarded[0].reason).toMatch(/En Venta != "Si"/);
  });

  it("descarta filas sin valor de arriendo", () => {
    const { units, discarded } = parseLabExcelRows(
      [{ Id: 1, "En Venta": "Si" } as RawLabRow],
      { capRateBruto: CAP_RATE, ufValueClp: UF }
    );
    expect(units).toHaveLength(0);
    expect(discarded[0].reason).toBe("sin valor de arriendo");
  });

  it("calcula priceClp y priceUf correctamente para una fila válida", () => {
    const { units } = parseLabExcelRows(
      [
        {
          Id: 167889,
          "En Venta": "Si",
          "Valor Arriendo Abril": 418549,
          Estado: "Arrendado",
          Comuna: "San Miguel",
          Dorm: 2,
          Baño: 1,
          Dirección: "Domingo Sta. María 2565",
          Depto: "401-B",
          "Superficie\nútil (m2)": 50,
        } as RawLabRow,
      ],
      { capRateBruto: CAP_RATE, ufValueClp: UF }
    );
    expect(units).toHaveLength(1);
    const u = units[0];
    expect(u.externalId).toBe("167889");
    expect(u.label).toBe("Unidad #167889 · San Miguel");
    expect(u.monthlyRentClp).toBe(418549);
    // priceClp = 418549 * 12 / 0.058 = 86,596,344.83 → redondeado 86,596,345
    expect(u.priceClp).toBe(86596345);
    // priceUf = 86596345 / 40000 = 2164.908... → 2 decimales
    expect(u.priceUf).toBeCloseTo(2164.91, 2);
    expect(u.ocupacion).toBe("ARRENDADO");
    expect(u.comuna).toBe("San Miguel");
    expect(u.dormitorios).toBe(2);
    expect(u.banos).toBe(1);
    expect(u.superficieUtilM2).toBe(50);
    expect(u.internalData.direccionExacta).toBe("Domingo Sta. María 2565");
    expect(u.internalData.depto).toBe("401-B");
    expect(u.internalData.estadoRaw).toBe("Arrendado");
  });

  it("usa Valor Arriendo como fallback si no hay Valor Arriendo Abril", () => {
    const { units } = parseLabExcelRows(
      [
        {
          Id: 99,
          "En Venta": "Si",
          "Valor Arriendo": 350000,
          // sin Valor Arriendo Abril
        } as RawLabRow,
      ],
      { capRateBruto: CAP_RATE, ufValueClp: UF }
    );
    expect(units[0].monthlyRentClp).toBe(350000);
  });

  it("mapea correctamente todos los estados al enum", () => {
    const cases: Array<[string | null, string]> = [
      ["Arrendado", "ARRENDADO"],
      ["Vacante", "VACANTE"],
      ["Por desocuparse", "POR_DESOCUPARSE"],
      ["Aviso salida", "AVISO_SALIDA"],
      ["Avisado para desocupar", "AVISADO_PARA_DESOCUPAR"],
      ["Publicada", "PUBLICADA"],
      ["arrendado", "ARRENDADO"], // case-insensitive
      ["foobar", "VACANTE"], // default
      [null, "VACANTE"],
    ];
    for (const [input, expected] of cases) {
      const { units } = parseLabExcelRows(
        [
          {
            Id: 1,
            "En Venta": "Si",
            "Valor Arriendo": 300000,
            Estado: input,
          } as RawLabRow,
        ],
        { capRateBruto: CAP_RATE, ufValueClp: UF }
      );
      expect(units[0].ocupacion, `mapeo de "${input}"`).toBe(expected);
    }
  });

  it("rechaza capRate fuera de (0,1)", () => {
    expect(() =>
      parseLabExcelRows([], { capRateBruto: 0, ufValueClp: UF })
    ).toThrow(/capRateBruto/);
    expect(() =>
      parseLabExcelRows([], { capRateBruto: 1, ufValueClp: UF })
    ).toThrow(/capRateBruto/);
    expect(() =>
      parseLabExcelRows([], { capRateBruto: 5.8, ufValueClp: UF })
    ).toThrow(/capRateBruto/);
  });

  it("rechaza ufValueClp <= 0", () => {
    expect(() =>
      parseLabExcelRows([], { capRateBruto: CAP_RATE, ufValueClp: 0 })
    ).toThrow(/ufValueClp/);
  });

  it("normaliza Id que viene como float '167889.0' a '167889'", () => {
    const { units } = parseLabExcelRows(
      [{ Id: "167889.0", "En Venta": "Si", "Valor Arriendo": 300000 } as RawLabRow],
      { capRateBruto: CAP_RATE, ufValueClp: UF }
    );
    expect(units[0].externalId).toBe("167889");
  });
});

describe("computePoolMetrics", () => {
  it("calcula métricas agregadas con ocupación correcta", () => {
    const { units } = parseLabExcelRows(
      [
        { Id: 1, "En Venta": "Si", "Valor Arriendo": 300000, Estado: "Arrendado" } as RawLabRow,
        { Id: 2, "En Venta": "Si", "Valor Arriendo": 400000, Estado: "Arrendado" } as RawLabRow,
        { Id: 3, "En Venta": "Si", "Valor Arriendo": 500000, Estado: "Vacante" } as RawLabRow,
        { Id: 4, "En Venta": "Si", "Valor Arriendo": 350000, Estado: "Por desocuparse" } as RawLabRow,
      ],
      { capRateBruto: CAP_RATE, ufValueClp: UF }
    );
    const m = computePoolMetrics(units);
    expect(m.totalUnits).toBe(4);
    expect(m.totalMonthlyRentClp).toBe(300000 + 400000 + 500000 + 350000);
    // 2 arrendadas de 4 = 50%
    expect(m.occupancyPct).toBe(50);
  });

  it("occupancyPct es null para pool vacío", () => {
    const m = computePoolMetrics([]);
    expect(m.occupancyPct).toBe(null);
    expect(m.totalUnits).toBe(0);
    expect(m.totalValueUf).toBe(0);
  });
});
