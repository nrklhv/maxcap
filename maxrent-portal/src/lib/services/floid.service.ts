/**
 * Floid Widget integration (server-side).
 *
 * Flujo productivo:
 *   1. POST /api/floid/evaluate → `createWidgetEvaluation` crea una `CreditEvaluation`
 *      en PENDING y devuelve la URL del widget para que el frontend lo abra.
 *   2. El usuario completa el flujo en `admin.floid.app/<merchant>/widget/<id>`
 *      (Clave Única, Clave Tributaria SII, 2FA — todo dentro del widget).
 *   3. Floid POSTea el reporte agregado a `/api/floid/callback`, que invoca
 *      `completeFloidEvaluationFromWidget` para parsear y persistir.
 *
 * Modo stub (`FLOID_USE_STUB=true` o falta `FLOID_WIDGET_URL`):
 *   - `createWidgetEvaluation` simula al toque un payload realista y deja
 *     la fila en COMPLETED, sin abrir widget. Útil para desarrollo de UI.
 *
 * IMPORTANTE: este servicio NO calcula score / riskLevel / maxApprovedAmount.
 * El staff revisa el reporte estructurado y aprueba reservas manualmente.
 *
 * @domain creditEvaluation
 * @see POST /api/floid/evaluate
 * @see POST /api/floid/callback
 * @see https://docs.floid.io/
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  parseFloidWidgetPayload,
  type FloidWidgetReport,
} from "@/lib/floid/parse-floid-response";
import { buildFloidWidgetUrl, isFloidWidgetEnabled } from "@/lib/floid/widget";

export type { FloidWidgetReport };

export interface FloidConsentContext {
  consentAt: Date;
  consentVersion: string;
}

/** Resultado de iniciar una evaluación: la fila PENDING + cómo abrir el widget (o `null` si stub). */
export interface CreateWidgetEvaluationResult {
  evaluationId: string;
  widgetUrl: string | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
}

/** RUT format expected by Floid: `12345678-9` (sin puntos, mayúsculas). */
export function normalizeRutForFloid(rut: string): string {
  return rut.replace(/\./g, "").replace(/\s/g, "").toUpperCase();
}

// ──────────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Crea una `CreditEvaluation` en PENDING y devuelve la URL del widget Floid.
 *
 * Si el widget no está configurado o `FLOID_USE_STUB=true`, completa la fila
 * inmediatamente con un payload stub y devuelve `widgetUrl=null`.
 */
export async function createWidgetEvaluation(
  userId: string,
  consent: FloidConsentContext
): Promise<CreateWidgetEvaluationResult> {
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

  if (!isFloidWidgetEnabled()) {
    // Modo stub: completar la fila al toque con un payload realista.
    const stubPayload = buildStubPayload(profile.rut, evaluation.id);
    await persistWidgetReport(evaluation.id, stubPayload);
    return { evaluationId: evaluation.id, widgetUrl: null, status: "COMPLETED" };
  }

  const widgetUrl = buildFloidWidgetUrl(profile.rut, evaluation.id);
  return { evaluationId: evaluation.id, widgetUrl, status: "PENDING" };
}

/**
 * Procesa el payload del callback del widget: localiza la fila por `custom`
 * (= `evaluationId` que enviamos), la parsea y la persiste como COMPLETED.
 */
export async function completeFloidEvaluationFromWidget(
  payload: unknown
): Promise<{ evaluationId: string }> {
  const report = parseFloidWidgetPayload(payload);
  if (!report) {
    throw new Error("Payload del widget no contiene secciones SP/SII/CMF reconocibles");
  }

  // El `custom` es el evaluationId que enviamos como query param al abrir el widget.
  const evaluationId = report.custom;
  if (!evaluationId) {
    throw new Error("Payload del widget no trae 'custom' (evaluationId)");
  }

  const evaluation = await prisma.creditEvaluation.findFirst({
    where: {
      OR: [{ id: evaluationId }, { floidCaseId: report.caseid ?? "__none__" }],
      status: { in: ["PENDING", "PROCESSING"] },
    },
    orderBy: { requestedAt: "desc" },
  });

  if (!evaluation) {
    throw new Error(
      `No se encontró evaluación pendiente para custom=${evaluationId} / caseid=${report.caseid ?? "(none)"}`
    );
  }

  await persistWidgetReport(evaluation.id, payload, report);
  return { evaluationId: evaluation.id };
}

// ──────────────────────────────────────────────────────────────────────────────
// Internals
// ──────────────────────────────────────────────────────────────────────────────

async function persistWidgetReport(
  evaluationId: string,
  rawPayload: unknown,
  prereport?: FloidWidgetReport
): Promise<void> {
  const report = prereport ?? parseFloidWidgetPayload(rawPayload);
  if (!report) {
    await prisma.creditEvaluation.update({
      where: { id: evaluationId },
      data: {
        status: "FAILED",
        errorMessage: "Payload del widget incompleto: sin SP/SII/CMF",
        rawResponse: (rawPayload ?? {}) as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });
    throw new Error("Payload del widget incompleto");
  }

  await prisma.creditEvaluation.update({
    where: { id: evaluationId },
    data: {
      status: "COMPLETED",
      summary: report.summary,
      downloadPdfUrl: report.downloadPdfUrl,
      floidCaseId: report.caseid,
      rawResponse: report.rawResponse as Prisma.InputJsonValue,
      completedAt: new Date(),
      errorMessage: null,
    },
  });
}

/**
 * Genera un payload de widget simulado con shape real (SP+SII+CMF) para desarrollo
 * sin tocar Floid. Los montos son determinísticos a partir del RUT.
 */
function buildStubPayload(rut: string, evaluationId: string): Record<string, unknown> {
  const rutClean = normalizeRutForFloid(rut);
  const rutNumber = parseInt(rutClean.replace(/\D/g, "").slice(0, 8), 10) || 12345678;
  const renta = 1_500_000 + (rutNumber % 4_000_000);
  const deudaTotal = 5_000_000 + (rutNumber % 100_000_000);
  const linea = 8_000_000 + (rutNumber % 12_000_000);

  return {
    code: 200,
    message: "OK (stub)",
    consumerId: rutClean,
    caseid: `stub-${evaluationId}`,
    custom: evaluationId,
    download_pdf: null,
    SP: {
      renta_imponible: {
        code: "200",
        msg: "OK (stub)",
        period: "202603",
        remuneracion: renta,
        meses_cotizados: 12,
        moneda: "CLP",
        fuente: "Superintendencia de Pensiones (stub)",
        fecha_consulta: new Date().toISOString().slice(0, 10),
      },
    },
    SII: {
      carpeta_tributaria: {
        code: "200",
        msg: "OK (stub)",
        data: {
          tipo: "ACREDITAR RENTA",
          nombre_emisor: "Inversionista Demo",
          rut_emisor: rutClean,
          datos_contribuyente: {
            fecha_inicio_actividades: "01/01/2015",
            actividad_economia: "ACTIVIDAD DEMO",
            actividad_economia_detalle: [
              { codigo: "100100", descripcion: "ACTIVIDAD DEMO PRINCIPAL" },
            ],
            categoria_tributaria: "Primera Categoría",
            domicilio: "DIRECCIÓN DEMO 123, SANTIAGO",
            sucursal: "",
            ultimos_documentos_timbrados: [],
            observaciones_tributarias: "No tiene observaciones",
          },
          bienes_raices: [],
          boletas_honorarios: [],
          F22: buildStubF22(renta),
        },
      },
    },
    CMF: {
      deuda: {
        code: "200",
        msg: "OK (stub)",
        data: {
          name: "Inversionista Demo",
          rut: rutClean,
          updated: new Date().toISOString().slice(0, 10),
          directDebt: [
            {
              institution: "Banco Demo",
              currentDebt: String(deudaTotal),
              between30To89Days: "0",
              over90Days: "0",
              total: String(deudaTotal),
            },
          ],
          indirectDebt: [],
          credits: {
            lines: [{ institution: "Banco Demo", direct: String(linea), indirect: "0" }],
            others: [],
          },
        },
      },
    },
    _stub: true,
  };
}

/**
 * Genera un F22 simulado para 2 años con códigos clave del Formulario 22.
 * Renta líquida imponible (170) ≈ 12 × renta mensual; otros derivan de ahí.
 */
function buildStubF22(rentaMensual: number): Record<string, unknown> {
  const rli2025 = rentaMensual * 12;
  const rli2024 = Math.round(rli2025 * 0.95); // año previo, levemente menor
  const mk = (rli: number) => ({
    glosa: {
      "170": String(rli),
      "1098": String(Math.round(rli * 0.99)),
      "158": String(Math.round(rli * 0.05)),
      "304": String(Math.round(rli * 0.001)),
      "305": String(Math.round(rli * 0.002)),
    },
    codigos: {
      "1": "DEMO",
      "2": "INVERSIONISTA",
      "5": "INVERSIONISTA DEMO",
      "8": "SANTIAGO",
      "13": "ACTIVIDAD DEMO PRINCIPAL",
      "14": "100100",
      "31": String(Math.round(rli * 0.005)),
      "91": String(Math.round(rli * 0.04)),
      "110": String(Math.round(rli * 0.02)),
      "157": "0",
      "158": String(Math.round(rli * 0.05)),
      "161": String(rli),
      "162": String(Math.round(rli * 0.01)),
      "170": String(rli),
      "304": String(Math.round(rli * 0.001)),
      "305": String(Math.round(rli * 0.002)),
      "461": String(rli),
      "547": String(rli),
      "1098": String(Math.round(rli * 0.99)),
      "8811": "CLP",
    },
  });
  return {
    "2024": mk(rli2024),
    "2025": mk(rli2025),
  };
}
