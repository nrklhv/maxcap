/**
 * Floid credit evaluation integration (server-side).
 *
 * Published API docs: https://docs.floid.io/
 *
 * Configure real calls with `FLOID_API_KEY`, `FLOID_SERVICE_PATH`, and `FLOID_API_URL`.
 * Use `FLOID_USE_STUB=true` to keep the deterministic stub (default when no API key is set).
 * Optional `FLOID_CALLBACK_URL` adds `callbackUrl` to the request body for async services; the
 * immediate HTTP response may be an acknowledgement — then `/api/floid/callback` completes the row.
 * Optional `FLOID_FETCH_TIMEOUT_MS` (digits only, max 600000) aborts the outbound `fetch` after N ms.
 *
 * @domain creditEvaluation
 * @see POST /api/floid/evaluate
 */

import { prisma } from "@/lib/prisma";
import type { EvaluationStatus, Prisma, RiskLevel } from "@prisma/client";
import {
  looksLikeFloidAsyncAck,
  parseFloidPayload,
  type FloidEvaluationResult,
} from "@/lib/floid/parse-floid-response";

export type { FloidEvaluationResult };

export interface FloidConsentContext {
  consentAt: Date;
  consentVersion: string;
}

export type RequestEvaluationRow = {
  id: string;
  status: EvaluationStatus;
  score?: number | null;
  riskLevel?: RiskLevel | null;
  maxApprovedAmount?: number | null;
  summary?: string | null;
};

type CallOutcome =
  | { kind: "completed"; result: FloidEvaluationResult }
  | {
      kind: "async_pending";
      raw: Record<string, unknown>;
      floidCaseId: string | null;
    };

function shouldUseStub(): boolean {
  if (process.env.FLOID_USE_STUB === "true") return true;
  if (process.env.FLOID_USE_STUB === "false") return false;
  return !process.env.FLOID_API_KEY?.trim();
}

/** RUT format expected by many Chilean APIs: 12345678-9 (no dots) */
export function normalizeRutForFloid(rut: string): string {
  return rut.replace(/\./g, "").replace(/\s/g, "").toUpperCase();
}

function extractCaseId(raw: Record<string, unknown>): string | null {
  const a = raw.caseid ?? raw.caseId ?? raw.case_id;
  return typeof a === "string" && a.length > 0 ? a : null;
}

export class FloidService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.FLOID_API_KEY || "";
    this.baseUrl = (process.env.FLOID_API_URL || "https://api.floid.app").replace(/\/$/, "");
  }

  /**
   * Creates a `CreditEvaluation`, calls Floid (or stub), and persists outcome.
   */
  async requestEvaluation(userId: string, consent: FloidConsentContext): Promise<RequestEvaluationRow> {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { rut: true },
    });

    if (!profile?.rut) {
      throw new Error("El usuario no tiene RUT registrado");
    }

    const evaluation = await prisma.creditEvaluation.create({
      data: {
        userId,
        status: "PENDING",
        rawResponse: {},
        consentAt: consent.consentAt,
        consentVersion: consent.consentVersion,
      },
    });

    try {
      await prisma.creditEvaluation.update({
        where: { id: evaluation.id },
        data: { status: "PROCESSING" },
      });

      const outcome = await this.callFloidApi(profile.rut, evaluation.id);

      if (outcome.kind === "async_pending") {
        const updated = await prisma.creditEvaluation.update({
          where: { id: evaluation.id },
          data: {
            status: "PROCESSING",
            rawResponse: outcome.raw as Prisma.InputJsonValue,
            floidCaseId: outcome.floidCaseId,
          },
        });
        return {
          id: updated.id,
          status: updated.status,
          score: updated.score,
          riskLevel: updated.riskLevel,
          maxApprovedAmount: updated.maxApprovedAmount ? Number(updated.maxApprovedAmount) : null,
          summary: updated.summary,
        };
      }

      const { result } = outcome;
      const updated = await prisma.creditEvaluation.update({
        where: { id: evaluation.id },
        data: {
          status: "COMPLETED",
          score: result.score,
          riskLevel: result.riskLevel,
          maxApprovedAmount: result.maxApprovedAmount,
          summary: result.summary,
          rawResponse: result.rawResponse as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });

      return {
        id: updated.id,
        status: updated.status,
        score: updated.score,
        riskLevel: updated.riskLevel,
        maxApprovedAmount: updated.maxApprovedAmount ? Number(updated.maxApprovedAmount) : null,
        summary: updated.summary,
      };
    } catch (error) {
      await prisma.creditEvaluation.update({
        where: { id: evaluation.id },
        data: {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Error desconocido",
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  private async callFloidApi(rut: string, evaluationId: string): Promise<CallOutcome> {
    if (shouldUseStub()) {
      return { kind: "completed", result: await this.stubEvaluation(rut) };
    }

    const servicePath = process.env.FLOID_SERVICE_PATH?.trim();
    if (!servicePath) {
      throw new Error(
        "FLOID_SERVICE_PATH no está configurado (ruta del servicio en la API Floid, ej. /mi-producto/consulta)"
      );
    }

    const idField = process.env.FLOID_ID_BODY_FIELD?.trim() || "id";
    const callbackBase = process.env.FLOID_CALLBACK_URL?.trim();
    const url = `${this.baseUrl}${servicePath.startsWith("/") ? "" : "/"}${servicePath}`;

    const body: Record<string, unknown> = {
      [idField]: normalizeRutForFloid(rut),
      caseid: evaluationId,
    };
    if (callbackBase) {
      body.callbackUrl = callbackBase;
    }

    const rawTimeout = process.env.FLOID_FETCH_TIMEOUT_MS?.trim();
    const timeoutMs =
      rawTimeout && /^\d+$/.test(rawTimeout)
        ? Math.min(600_000, Math.max(1_000, parseInt(rawTimeout, 10)))
        : undefined;
    const signal =
      timeoutMs !== undefined && typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
        ? AbortSignal.timeout(timeoutMs)
        : undefined;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
        ...(signal ? { signal } : {}),
      });
    } catch (e) {
      const timedOut =
        timeoutMs !== undefined &&
        e instanceof Error &&
        (e.name === "TimeoutError" ||
          e.name === "AbortError" ||
          /aborted|timeout/i.test(e.message));
      if (timedOut) {
        throw new Error(
          `Floid no respondió en ${timeoutMs} ms (FLOID_FETCH_TIMEOUT_MS). Misma situación que curl con 0 bytes: revisá red, probá IPv4 (curl -4), o consultá a Floid por latencia de ${servicePath}.`
        );
      }
      throw e;
    }

    const text = await response.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Floid API: respuesta no JSON (HTTP ${response.status})`);
    }

    const raw = (typeof json === "object" && json !== null ? json : { value: json }) as Record<
      string,
      unknown
    >;

    if (!response.ok) {
      const msg = typeof raw.msg === "string" ? raw.msg : typeof raw.message === "string" ? raw.message : text;
      throw new Error(`Floid API error ${response.status}: ${msg || "sin detalle"}`);
    }

    if (callbackBase && looksLikeFloidAsyncAck(raw)) {
      return {
        kind: "async_pending",
        raw,
        floidCaseId: extractCaseId(raw),
      };
    }

    const parsed = parseFloidPayload(raw);
    if (!parsed) {
      throw new Error(
        "Floid devolvió 200 pero el cuerpo no contiene campos reconocibles (score / montos). Ajusta FLOID_SERVICE_PATH o el parser en lib/floid/parse-floid-response.ts."
      );
    }

    return { kind: "completed", result: parsed };
  }

  private async stubEvaluation(rut: string): Promise<FloidEvaluationResult> {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const rutNumber = parseInt(rut.replace(/\D/g, "").slice(0, 8), 10);
    const score = 300 + (rutNumber % 550);
    const maxAmount = Math.round((score / 850) * 120_000_000);

    let riskLevel: RiskLevel;
    let summary: string;

    if (score >= 700) {
      riskLevel = "LOW";
      summary = `Excelente historial crediticio. Score de ${score} puntos. Aprobado para compra de propiedades hasta $${maxAmount.toLocaleString("es-CL")} CLP.`;
    } else if (score >= 500) {
      riskLevel = "MEDIUM";
      summary = `Historial crediticio aceptable. Score de ${score} puntos. Aprobado con condiciones para propiedades hasta $${maxAmount.toLocaleString("es-CL")} CLP.`;
    } else {
      riskLevel = "HIGH";
      summary = `El historial crediticio presenta observaciones. Score de ${score} puntos. Recomendamos mejorar tu perfil crediticio antes de continuar.`;
    }

    return {
      score,
      riskLevel,
      maxApprovedAmount: maxAmount,
      summary,
      rawResponse: {
        _stub: true,
        rut: normalizeRutForFloid(rut),
        score,
        riskLevel,
        maxApprovedAmount: maxAmount,
        evaluatedAt: new Date().toISOString(),
      },
    };
  }
}

export const floidService = new FloidService();

/**
 * Completes an evaluation row when Floid POSTs the async result to our callback URL.
 * Looks up the row by `id` (when we sent `caseid` = evaluation cuid) or by `floidCaseId`.
 */
export async function completeFloidEvaluationFromCallbackPayload(
  caseId: string,
  payload: unknown
): Promise<{ evaluationId: string }> {
  const evaluation = await prisma.creditEvaluation.findFirst({
    where: {
      OR: [{ id: caseId }, { floidCaseId: caseId }],
      status: { in: ["PENDING", "PROCESSING"] },
    },
    orderBy: { requestedAt: "desc" },
  });

  if (!evaluation) {
    throw new Error("No se encontró evaluación pendiente para el caseid recibido");
  }

  const raw = (typeof payload === "object" && payload !== null ? payload : {}) as Record<string, unknown>;
  const parsed = parseFloidPayload(raw);
  if (!parsed) {
    await prisma.creditEvaluation.update({
      where: { id: evaluation.id },
      data: {
        rawResponse: raw as Prisma.InputJsonValue,
        errorMessage: "Callback Floid: payload incompleto (sin score mapeable)",
        status: "FAILED",
        completedAt: new Date(),
      },
    });
    throw new Error("Payload de callback incompleto");
  }

  await prisma.creditEvaluation.update({
    where: { id: evaluation.id },
    data: {
      status: "COMPLETED",
      score: parsed.score,
      riskLevel: parsed.riskLevel,
      maxApprovedAmount: parsed.maxApprovedAmount,
      summary: parsed.summary,
      rawResponse: parsed.rawResponse as Prisma.InputJsonValue,
      floidCaseId: extractCaseId(raw) ?? evaluation.floidCaseId,
      completedAt: new Date(),
      errorMessage: null,
    },
  });

  return { evaluationId: evaluation.id };
}
