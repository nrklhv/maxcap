/**
 * Form state and mapping for labor / income data stored under `Profile.additionalData.labor`.
 *
 * @domain portal
 * @see laborProfileSchema in validations.ts
 */

import { laborProfileSchema, type LaborProfileInput } from "@/lib/validations";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export type LaborFormState = {
  employmentType: "" | "DEPENDENT" | "INDEPENDENT";
  indefiniteContract: boolean;
  currentJobTenure: string;
  independentInvoicesYears: string;
  independentActivity: string;
  monthlyNetIncomeClp: string;
  complementsIncomeWithCotitular: boolean;
  cotitularMonthlyNetIncomeClp: string;
  monthlyDebtPaymentsClp: string;
};

export function emptyLaborForm(): LaborFormState {
  return {
    employmentType: "",
    indefiniteContract: false,
    currentJobTenure: "",
    independentInvoicesYears: "",
    independentActivity: "",
    monthlyNetIncomeClp: "",
    complementsIncomeWithCotitular: false,
    cotitularMonthlyNetIncomeClp: "",
    monthlyDebtPaymentsClp: "",
  };
}

/** Read `additionalData.labor` from API into editable form strings. */
export function laborFormFromStored(additionalData: unknown): LaborFormState {
  if (!isRecord(additionalData) || !isRecord(additionalData.labor)) {
    return emptyLaborForm();
  }
  const labor = additionalData.labor;
  const et = labor.employmentType;
  const base = emptyLaborForm();
  if (et !== "DEPENDENT" && et !== "INDEPENDENT") return base;
  return {
    employmentType: et,
    indefiniteContract: Boolean(labor.indefiniteContract),
    currentJobTenure: String(labor.currentJobTenure ?? ""),
    independentInvoicesYears:
      labor.independentInvoicesYears != null ? String(labor.independentInvoicesYears) : "",
    independentActivity: String(labor.independentActivity ?? ""),
    monthlyNetIncomeClp:
      labor.monthlyNetIncomeClp != null ? String(labor.monthlyNetIncomeClp) : "",
    complementsIncomeWithCotitular: Boolean(labor.complementsIncomeWithCotitular),
    cotitularMonthlyNetIncomeClp:
      labor.cotitularMonthlyNetIncomeClp != null ? String(labor.cotitularMonthlyNetIncomeClp) : "",
    monthlyDebtPaymentsClp:
      labor.monthlyDebtPaymentsClp != null ? String(labor.monthlyDebtPaymentsClp) : "",
  };
}

/** Parse digits-only CLP-style input to non-negative integer. */
export function parseClpInt(s: string): number {
  const digits = String(s).replace(/\D/g, "");
  if (!digits) return 0;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/**
 * Build API payload for `labor` or `undefined` if the user did not choose an employment type.
 */
export function laborFormToApiPayload(form: LaborFormState): LaborProfileInput | undefined {
  if (!form.employmentType) return undefined;

  const monthlyNetIncomeClp = parseClpInt(form.monthlyNetIncomeClp);
  const monthlyDebtPaymentsClp = parseClpInt(form.monthlyDebtPaymentsClp);
  const complementsIncomeWithCotitular = form.complementsIncomeWithCotitular;
  const cotitularMonthlyNetIncomeClp = complementsIncomeWithCotitular
    ? parseClpInt(form.cotitularMonthlyNetIncomeClp)
    : undefined;

  if (form.employmentType === "DEPENDENT") {
    return {
      employmentType: "DEPENDENT",
      indefiniteContract: form.indefiniteContract,
      currentJobTenure: form.currentJobTenure.trim(),
      monthlyNetIncomeClp,
      complementsIncomeWithCotitular,
      cotitularMonthlyNetIncomeClp,
      monthlyDebtPaymentsClp,
    };
  }

  const yearsDigits = form.independentInvoicesYears.replace(/\D/g, "");
  const independentInvoicesYears = yearsDigits ? parseInt(yearsDigits, 10) : 0;

  return {
    employmentType: "INDEPENDENT",
    independentInvoicesYears: Number.isFinite(independentInvoicesYears)
      ? Math.max(0, independentInvoicesYears)
      : 0,
    independentActivity: form.independentActivity.trim(),
    monthlyNetIncomeClp,
    complementsIncomeWithCotitular,
    cotitularMonthlyNetIncomeClp,
    monthlyDebtPaymentsClp,
  };
}

export function formatClp(n: number): string {
  return `$${n.toLocaleString("es-CL")}`;
}

/** Raw `additionalData.labor` for validation (may include server-only fields like `updatedAt`). */
export function extractLaborFromAdditionalData(additionalData: unknown): unknown {
  if (!isRecord(additionalData) || !isRecord(additionalData.labor)) {
    return undefined;
  }
  return additionalData.labor;
}

/**
 * True when persisted `additionalData.labor` satisfies {@link laborProfileSchema}.
 * Used with merged `additionalData` after a profile PUT to set `onboardingCompleted`.
 *
 * @pure
 */
export function isLaborProfileComplete(additionalData: unknown): boolean {
  const labor = extractLaborFromAdditionalData(additionalData);
  if (labor === undefined) return false;
  return laborProfileSchema.safeParse(labor).success;
}

/**
 * Investor "perfil listo" for journey, JWT, and dashboard: DB flag plus valid labor block.
 * Fixes legacy rows where `onboardingCompleted` stayed true without `additionalData.labor`.
 *
 * @pure
 */
export function isInvestorPerfilCompleteForPortal(
  profile: { onboardingCompleted: boolean; additionalData: unknown } | null | undefined
): boolean {
  if (!profile) return false;
  return Boolean(profile.onboardingCompleted) && isLaborProfileComplete(profile.additionalData);
}
