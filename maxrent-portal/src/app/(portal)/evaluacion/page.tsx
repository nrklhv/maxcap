// =============================================================================
// Evaluación — Ver resultado crediticio / solicitar evaluación
// =============================================================================

"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { BarChart3, AlertCircle, CheckCircle, Clock, RefreshCw } from "lucide-react";

type Evaluation = {
  id: string;
  status: string;
  score: number | null;
  riskLevel: string | null;
  maxApprovedAmount: string | null;
  summary: string | null;
  requestedAt: string;
  completedAt: string | null;
};

export default function EvaluacionPage() {
  const { data: session } = useSession();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState("");

  const loadEvaluation = useCallback(async () => {
    try {
      const res = await fetch("/api/floid/evaluations");
      if (res.ok) {
        const data = await res.json();
        if (data.evaluations?.length > 0) {
          setEvaluation(data.evaluations[0]); // Más reciente
        }
      }
    } catch {
      // Sin evaluaciones aún
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvaluation();
  }, [loadEvaluation]);

  // Polling si está en proceso
  useEffect(() => {
    if (evaluation?.status === "PENDING" || evaluation?.status === "PROCESSING") {
      const interval = setInterval(loadEvaluation, 5000);
      return () => clearInterval(interval);
    }
  }, [evaluation?.status, loadEvaluation]);

  const requestEvaluation = async () => {
    setRequesting(true);
    setError("");
    try {
      const res = await fetch("/api/floid/evaluate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al solicitar evaluación");
        return;
      }
      setEvaluation(data.evaluation);
    } catch {
      setError("Error de conexión");
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // No ha completado onboarding
  if (!session?.user?.onboardingCompleted) {
    return (
      <div className="max-w-lg space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Evaluación Crediticia</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Completa tu perfil primero</p>
              <p className="text-sm text-amber-700 mt-1">
                Necesitamos tu RUT y datos personales para poder realizar la evaluación crediticia.
              </p>
              <a href="/perfil" className="inline-block mt-3 text-sm font-medium text-amber-700 underline">
                Ir a completar perfil →
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sin evaluación aún
  if (!evaluation) {
    return (
      <div className="max-w-lg space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Evaluación Crediticia</h1>
          <p className="mt-1 text-gray-600">
            Evalúa tu capacidad de compra con nuestro análisis crediticio.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-blue-50 rounded-full flex items-center justify-center">
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">¿Listo para evaluarte?</h3>
            <p className="text-sm text-gray-500 mt-1">
              Analizaremos tu historial crediticio para determinar tu capacidad de compra.
              El proceso toma solo unos segundos.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <button
            onClick={requestEvaluation}
            disabled={requesting}
            className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {requesting ? "Solicitando..." : "Solicitar evaluación"}
          </button>
        </div>
      </div>
    );
  }

  // Evaluación en proceso
  if (evaluation.status === "PENDING" || evaluation.status === "PROCESSING") {
    return (
      <div className="max-w-lg space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Evaluación Crediticia</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-blue-50 rounded-full flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Evaluando...</h3>
            <p className="text-sm text-gray-500 mt-1">
              Estamos procesando tu información crediticia. Esto puede tomar unos segundos.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Evaluación fallida
  if (evaluation.status === "FAILED") {
    return (
      <div className="max-w-lg space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Evaluación Crediticia</h1>
        <div className="bg-white rounded-xl border border-red-200 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-500 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">No pudimos completar tu evaluación</h3>
              <p className="text-sm text-gray-600 mt-1">
                Hubo un problema al procesar tu información. Por favor intenta nuevamente o
                contacta a soporte.
              </p>
            </div>
          </div>
          <button
            onClick={requestEvaluation}
            disabled={requesting}
            className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            Reintentar evaluación
          </button>
        </div>
      </div>
    );
  }

  // Evaluación completada — mostrar resultados
  const riskColors = {
    LOW: { bg: "bg-green-100", text: "text-green-700", label: "Bajo" },
    MEDIUM: { bg: "bg-amber-100", text: "text-amber-700", label: "Medio" },
    HIGH: { bg: "bg-red-100", text: "text-red-700", label: "Alto" },
  };
  const risk = riskColors[evaluation.riskLevel as keyof typeof riskColors] || riskColors.MEDIUM;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Evaluación Crediticia</h1>
        <div className="flex items-center gap-1.5 text-sm text-green-700">
          <CheckCircle className="w-4 h-4" />
          Completada
        </div>
      </div>

      {/* Score Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Score */}
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">Score crediticio</p>
            <p className="text-4xl font-bold text-gray-900">{evaluation.score || "—"}</p>
          </div>

          {/* Nivel de riesgo */}
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">Nivel de riesgo</p>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${risk.bg} ${risk.text}`}>
              {risk.label}
            </span>
          </div>

          {/* Monto aprobado */}
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">Monto máximo aprobado</p>
            <p className="text-xl font-bold text-gray-900">
              {evaluation.maxApprovedAmount
                ? `$${Number(evaluation.maxApprovedAmount).toLocaleString("es-CL")}`
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Resumen */}
      {evaluation.summary && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Resumen</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{evaluation.summary}</p>
        </div>
      )}

      {/* Fecha */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Clock className="w-3.5 h-3.5" />
        Evaluado el{" "}
        {new Date(evaluation.completedAt || evaluation.requestedAt).toLocaleDateString("es-CL", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>

      {/* CTA a reserva */}
      {evaluation.riskLevel !== "HIGH" && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <p className="text-sm font-medium text-blue-800">
            Tu evaluación te permite avanzar con una reserva.
          </p>
          <a
            href="/reserva"
            className="inline-block mt-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ver propiedades disponibles →
          </a>
        </div>
      )}
    </div>
  );
}
