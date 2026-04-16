// =============================================================================
// Floid Service — Integración con API de evaluación crediticia
// =============================================================================
// STUB: Este servicio está preparado para enchufar la API real de Floid.
// Por ahora simula respuestas para poder desarrollar el flujo completo.
//
// Cuando tengas la documentación de Floid, reemplaza:
// 1. La función callFloidApi() con la llamada real
// 2. La función parseFloidResponse() con el mapeo de su respuesta
// =============================================================================

import { prisma } from "@/lib/prisma";
import type { EvaluationStatus, Prisma, RiskLevel } from "@prisma/client";

// --- Tipos de la respuesta de Floid (ajustar cuando tengas la doc) ---

export interface FloidEvaluationResult {
  score: number;
  riskLevel: RiskLevel;
  maxApprovedAmount: number;
  summary: string;
  rawResponse: Record<string, unknown>;
}

// --- Servicio principal ---

export class FloidService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.FLOID_API_KEY || "";
    this.baseUrl = process.env.FLOID_API_URL || "https://api.floid.cl";
  }

  /**
   * Solicitar evaluación crediticia para un usuario.
   * Crea el registro en BD, llama a Floid, y guarda el resultado.
   */
  async requestEvaluation(userId: string): Promise<{
    id: string;
    status: EvaluationStatus;
    score?: number | null;
    riskLevel?: RiskLevel | null;
    maxApprovedAmount?: number | null;
    summary?: string | null;
  }> {
    // Obtener RUT del usuario
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { rut: true },
    });

    if (!profile?.rut) {
      throw new Error("El usuario no tiene RUT registrado");
    }

    // Crear registro de evaluación en estado PENDING
    const evaluation = await prisma.creditEvaluation.create({
      data: {
        userId,
        status: "PENDING",
        rawResponse: {},
      },
    });

    try {
      // Actualizar a PROCESSING
      await prisma.creditEvaluation.update({
        where: { id: evaluation.id },
        data: { status: "PROCESSING" },
      });

      // Llamar a Floid API
      const result = await this.callFloidApi(profile.rut);

      // Guardar resultado
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
      // Marcar como fallido
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

  // =========================================================================
  // STUB — Reemplazar con la integración real de Floid
  // =========================================================================

  /**
   * Llamar a la API de Floid con el RUT del usuario.
   *
   * TODO: Reemplazar con la llamada real cuando tengas la documentación.
   * Ejemplo de cómo sería la llamada real:
   *
   * ```typescript
   * private async callFloidApi(rut: string): Promise<FloidEvaluationResult> {
   *   const response = await fetch(`${this.baseUrl}/v1/credit/evaluate`, {
   *     method: "POST",
   *     headers: {
   *       "Authorization": `Bearer ${this.apiKey}`,
   *       "Content-Type": "application/json",
   *     },
   *     body: JSON.stringify({ rut }),
   *   });
   *
   *   if (!response.ok) {
   *     throw new Error(`Floid API error: ${response.status}`);
   *   }
   *
   *   const data = await response.json();
   *   return this.parseFloidResponse(data);
   * }
   * ```
   */
  private async callFloidApi(rut: string): Promise<FloidEvaluationResult> {
    // ⚠️ STUB: Simula una respuesta de Floid para desarrollo
    // Remover esta simulación cuando tengas la API real

    // Simular delay de API
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generar score pseudo-aleatorio basado en RUT (determinístico)
    const rutNumber = parseInt(rut.replace(/\D/g, "").slice(0, 8), 10);
    const score = 300 + (rutNumber % 550); // Score entre 300 y 850
    const maxAmount = Math.round((score / 850) * 120_000_000); // Hasta 120M CLP

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
        _note: "Esta es una respuesta simulada. Reemplazar con datos reales de Floid.",
        rut,
        score,
        riskLevel,
        maxApprovedAmount: maxAmount,
        evaluatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Parsear la respuesta real de Floid al formato interno.
   *
   * TODO: Implementar cuando tengas la estructura real de la respuesta.
   */
  // private parseFloidResponse(data: unknown): FloidEvaluationResult {
  //   // Mapear campos de Floid a nuestro formato
  //   return {
  //     score: data.score,
  //     riskLevel: ...,
  //     maxApprovedAmount: ...,
  //     summary: ...,
  //     rawResponse: data,
  //   };
  // }
}

// Singleton
export const floidService = new FloidService();
