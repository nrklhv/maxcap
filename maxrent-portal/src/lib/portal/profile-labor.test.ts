import { describe, expect, it } from "vitest";
import {
  extractLaborFromAdditionalData,
  isInvestorPerfilCompleteForPortal,
  isLaborProfileComplete,
} from "./profile-labor";

describe("extractLaborFromAdditionalData", () => {
  it("returns undefined when labor missing", () => {
    expect(extractLaborFromAdditionalData(null)).toBeUndefined();
    expect(extractLaborFromAdditionalData({})).toBeUndefined();
    expect(extractLaborFromAdditionalData({ other: 1 })).toBeUndefined();
  });

  it("returns labor object", () => {
    const labor = { employmentType: "DEPENDENT" };
    expect(extractLaborFromAdditionalData({ labor })).toEqual(labor);
  });
});

describe("isInvestorPerfilCompleteForPortal", () => {
  it("false when profile null", () => {
    expect(isInvestorPerfilCompleteForPortal(null)).toBe(false);
    expect(isInvestorPerfilCompleteForPortal(undefined)).toBe(false);
  });

  it("false when column true but labor missing (legacy)", () => {
    expect(
      isInvestorPerfilCompleteForPortal({
        onboardingCompleted: true,
        additionalData: {},
      })
    ).toBe(false);
  });

  it("true when column true and labor valid", () => {
    expect(
      isInvestorPerfilCompleteForPortal({
        onboardingCompleted: true,
        additionalData: {
          labor: {
            employmentType: "DEPENDENT",
            indefiniteContract: true,
            currentJobTenure: "2 años",
            monthlyNetIncomeClp: 1_000_000,
            complementsIncomeWithCotitular: false,
            monthlyDebtPaymentsClp: 0,
          },
        },
      })
    ).toBe(true);
  });

  it("false when column false even if labor valid", () => {
    expect(
      isInvestorPerfilCompleteForPortal({
        onboardingCompleted: false,
        additionalData: {
          labor: {
            employmentType: "DEPENDENT",
            indefiniteContract: true,
            currentJobTenure: "2 años",
            monthlyNetIncomeClp: 1,
            complementsIncomeWithCotitular: false,
            monthlyDebtPaymentsClp: 0,
          },
        },
      })
    ).toBe(false);
  });
});

describe("isLaborProfileComplete", () => {
  it("false without labor", () => {
    expect(isLaborProfileComplete(null)).toBe(false);
    expect(isLaborProfileComplete({})).toBe(false);
  });

  it("false for incomplete labor", () => {
    expect(
      isLaborProfileComplete({
        labor: { employmentType: "DEPENDENT" },
      })
    ).toBe(false);
  });

  it("true for valid DEPENDENT labor (extra keys ignored by zod)", () => {
    expect(
      isLaborProfileComplete({
        labor: {
          employmentType: "DEPENDENT",
          indefiniteContract: true,
          currentJobTenure: "2 años",
          monthlyNetIncomeClp: 1_000_000,
          complementsIncomeWithCotitular: false,
          monthlyDebtPaymentsClp: 0,
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      })
    ).toBe(true);
  });

  it("true for valid INDEPENDENT labor", () => {
    expect(
      isLaborProfileComplete({
        labor: {
          employmentType: "INDEPENDENT",
          independentInvoicesYears: 2,
          independentActivity: "Servicios",
          monthlyNetIncomeClp: 2_000_000,
          complementsIncomeWithCotitular: false,
          monthlyDebtPaymentsClp: 100_000,
        },
      })
    ).toBe(true);
  });

  it("false when cotitular income missing but flag true", () => {
    expect(
      isLaborProfileComplete({
        labor: {
          employmentType: "DEPENDENT",
          indefiniteContract: true,
          currentJobTenure: "1 año",
          monthlyNetIncomeClp: 1,
          complementsIncomeWithCotitular: true,
          monthlyDebtPaymentsClp: 0,
        },
      })
    ).toBe(false);
  });
});
