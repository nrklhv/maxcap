/**
 * Maps arbitrary Floid JSON payloads into portal {@link FloidEvaluationResult} fields.
 * Floid products differ by contract; this layer accepts common key shapes and infers risk from score when needed.
 *
 * @domain creditEvaluation
 * @see https://docs.floid.io/ — REST + JSON response patterns
 */

import type { RiskLevel } from "@prisma/client";
import { z } from "zod";

export interface FloidEvaluationResult {
  score: number;
  riskLevel: RiskLevel;
  maxApprovedAmount: number;
  summary: string;
  rawResponse: Record<string, unknown>;
}

const looseRecord = z.record(z.string(), z.unknown());

function pickNumber(...vals: Array<unknown>): number | null {
  for (const v of vals) {
    if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
    if (typeof v === "string" && v.trim() !== "") {
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

function riskFromScore(score: number): RiskLevel {
  if (score >= 700) return "LOW";
  if (score >= 500) return "MEDIUM";
  return "HIGH";
}

function mapRiskToken(raw: string | null): RiskLevel | null {
  if (!raw) return null;
  const u = raw.toUpperCase();
  if (u.includes("LOW") || u.includes("BAJO")) return "LOW";
  if (u.includes("MEDIUM") || u.includes("MEDIO") || u.includes("MED")) return "MEDIUM";
  if (u.includes("HIGH") || u.includes("ALTO")) return "HIGH";
  return null;
}

/**
 * Returns a full {@link FloidEvaluationResult} when enough data exists; otherwise `null`
 * (e.g. async acknowledgement payload without scores yet).
 */
export function parseFloidPayload(data: unknown): FloidEvaluationResult | null {
  const parsed = looseRecord.safeParse(data);
  if (!parsed.success) {
    return null;
  }

  const o = parsed.data;

  const nested =
    typeof o.data === "object" && o.data !== null && !Array.isArray(o.data)
      ? (o.data as Record<string, unknown>)
      : null;
  const result =
    typeof o.result === "object" && o.result !== null && !Array.isArray(o.result)
      ? (o.result as Record<string, unknown>)
      : null;

  const score =
    pickNumber(
      o.score,
      o.credit_score,
      o.creditScore,
      nested?.score,
      result?.score,
      (o as { resultado?: { score?: unknown } }).resultado?.score
    ) ?? null;

  const maxApprovedAmount =
    pickNumber(
      o.maxApprovedAmount,
      o.max_approved_amount,
      o.monto,
      o.monto_aprobado,
      o.amount,
      nested?.maxApprovedAmount,
      result?.maxApprovedAmount
    ) ?? (score !== null ? Math.min(120_000_000, Math.round((score / 850) * 120_000_000)) : null);

  const summary =
    pickString(o.msg, o.message, o.summary, o.descripcion, nested?.msg, result?.message) ??
    (score !== null ? `Evaluación financiera procesada (score ${score}).` : null);

  const riskExplicit = mapRiskToken(pickString(o.riskLevel, o.risk_level, o.riesgo, nested?.riskLevel));

  if (score === null || maxApprovedAmount === null || summary === null) {
    return null;
  }

  const riskLevel = riskExplicit ?? riskFromScore(score);

  return {
    score,
    riskLevel,
    maxApprovedAmount,
    summary,
    rawResponse: o,
  };
}

/**
 * True if payload looks like an async acceptance (no score yet, optional case id / code).
 */
export function looksLikeFloidAsyncAck(data: unknown): boolean {
  const parsed = looseRecord.safeParse(data);
  if (!parsed.success) return false;
  const o = parsed.data;
  if (parseFloidPayload(data) !== null) return false;
  const code = pickString(o.code, o.status);
  const hasCase = pickString(o.caseid, o.caseId, o.case_id);
  return Boolean(code === "200" || hasCase);
}
