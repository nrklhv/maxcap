/**
 * Investor portal — financial / credit evaluation (Floid).
 * Commercial preflight: free badge, steps, send vs. receive summary, dual consent + server validation.
 *
 * @route /evaluacion
 * @domain creditEvaluation
 */

"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Gift,
  ArrowRight,
  Shield,
  FileText,
} from "lucide-react";
import { FLOID_CONSENT_VERSION } from "@/lib/floid/constants";

type Evaluation = {
  id: string;
  status: string;
  score: number | null;
  riskLevel: string | null;
  maxApprovedAmount: string | null;
  summary: string | null;
  requestedAt: string;
  completedAt: string | null;
  errorMessage?: string | null;
  staffReservationApprovedAt?: string | null;
};

/** Pretty-print Chile RUT for display (best-effort). */
function formatRutForDisplay(rut: string | null | undefined): string {
  if (!rut?.trim()) return "—";
  const clean = rut.replace(/\./g, "").replace(/-/g, "").toUpperCase();
  if (clean.length < 2) return rut;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const rev = body.split("").reverse();
  const parts: string[] = [];
  for (let i = 0; i < rev.length; i += 3) {
    parts.push(rev.slice(i, i + 3).reverse().join(""));
  }
  const withDots = parts.reverse().join(".");
  return `${withDots}-${dv}`;
}

function StepsTimeline() {
  const steps = [
    { n: 1, title: "Revisa qué compartimos", desc: "RUT y metadatos técnicos de la solicitud." },
    { n: 2, title: "Autoriza a Floid", desc: "Con tu visto bueno conectamos desde nuestros servidores." },
    { n: 3, title: "Recibe tu resultado", desc: "Segundos o minutos si el proceso es asíncrono." },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {steps.map((s) => (
        <div
          key={s.n}
          className="relative flex gap-3 rounded-xl border border-gray-200 bg-gray-50/80 p-4 text-left"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
            {s.n}
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900">{s.title}</p>
            <p className="mt-0.5 text-xs text-gray-600 leading-snug">{s.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EvaluacionPage() {
  const { data: session } = useSession();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState("");
  const [previewChecked, setPreviewChecked] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [profileRut, setProfileRut] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadEvaluation = useCallback(async () => {
    try {
      const res = await fetch("/api/floid/evaluations");
      if (res.ok) {
        const data = await res.json();
        if (data.evaluations?.length > 0) {
          setEvaluation(data.evaluations[0]);
        } else {
          setEvaluation(null);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvaluation();
  }, [loadEvaluation]);

  useEffect(() => {
    if (evaluation?.status === "PENDING" || evaluation?.status === "PROCESSING") {
      const interval = setInterval(loadEvaluation, 5000);
      return () => clearInterval(interval);
    }
  }, [evaluation?.status, loadEvaluation]);

  const needPreflightProfile =
    session?.user?.onboardingCompleted &&
    (!evaluation || evaluation.status === "FAILED");

  useEffect(() => {
    if (!needPreflightProfile || loading) return;
    let cancelled = false;
    (async () => {
      setProfileLoading(true);
      try {
        const res = await fetch("/api/users/profile");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setProfileRut(data.profile?.rut ?? null);
        }
      } catch {
        if (!cancelled) setProfileRut(null);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [needPreflightProfile, loading, evaluation?.status]);

  const requestEvaluation = async () => {
    if (!previewChecked || !consentChecked) {
      setError("Marca ambas casillas para continuar: revisión de datos y consentimiento.");
      return;
    }
    setRequesting(true);
    setError("");
    try {
      const res = await fetch("/api/floid/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataPreviewAcknowledged: true as const,
          consentAccepted: true as const,
          consentVersion: FLOID_CONSENT_VERSION,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al solicitar evaluación");
        return;
      }
      setEvaluation(data.evaluation);
      setPreviewChecked(false);
      setConsentChecked(false);
    } catch {
      setError("Error de conexión");
    } finally {
      setRequesting(false);
    }
  };

  const dualConsentBlock = (
    <div className="space-y-4">
      <label className="flex items-start gap-3 cursor-pointer text-left">
        <input
          type="checkbox"
          checked={previewChecked}
          onChange={(e) => setPreviewChecked(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700 leading-relaxed">
          Confirmo que <strong>revisé el RUT</strong> y la descripción de lo que MaxRent envía a Floid y de lo
          que esperamos recibir, mostrada arriba en esta pantalla.
        </span>
      </label>
      <label className="flex items-start gap-3 cursor-pointer text-left">
        <input
          type="checkbox"
          checked={consentChecked}
          onChange={(e) => setConsentChecked(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700 leading-relaxed">
          Autorizo a <strong>MaxRent</strong> a enviar mi identificador (RUT) y los datos necesarios a{" "}
          <strong>Floid</strong> para obtener una <strong>evaluación financiera / crediticia</strong>.
          Entiendo que el resultado depende de terceros y de las fuentes que consulte Floid. Términos
          mostrados: <span className="font-mono text-xs text-gray-600">{FLOID_CONSENT_VERSION}</span>.
        </span>
      </label>
    </div>
  );

  const sendReceiveCards = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-5">
        <div className="flex items-center gap-2 text-blue-800 mb-3">
          <Shield className="h-5 w-5 shrink-0" />
          <h4 className="text-sm font-semibold">Qué enviamos a Floid</h4>
        </div>
        <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside marker:text-blue-500">
          <li>
            Tu <strong>RUT</strong> como identificador (el mismo de tu perfil:{" "}
            <span className="font-semibold text-gray-900">
              {profileLoading ? "cargando…" : formatRutForDisplay(profileRut)}
            </span>
            ).
          </li>
          <li>
            Un <strong>identificador técnico</strong> de la solicitud para correlacionar la respuesta.
          </li>
          <li className="text-gray-600">
            No ingresamos contraseñas de banco en esta pantalla; solo lo estrictamente necesario para el
            servicio contratado con Floid.
          </li>
        </ul>
      </div>
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-5">
        <div className="flex items-center gap-2 text-emerald-900 mb-3">
          <FileText className="h-5 w-5 shrink-0" />
          <h4 className="text-sm font-semibold">Qué esperamos recibir</h4>
        </div>
        <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside marker:text-emerald-600">
          <li>
            Un <strong>score</strong> y un <strong>nivel de riesgo</strong> orientativos.
          </li>
          <li>
            Un <strong>monto máximo estimado</strong> de compra y un <strong>resumen</strong> en lenguaje
            claro.
          </li>
          <li className="text-gray-600">
            El detalle exacto depende del producto Floid contratado; la respuesta completa queda registrada
            internamente para auditoría.
          </li>
        </ul>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session?.user?.onboardingCompleted) {
    return (
      <div className="max-w-lg space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Evaluación financiera</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Completa tu perfil primero</p>
              <p className="text-sm text-amber-700 mt-1">
                Necesitamos tu RUT y datos personales para poder realizar la evaluación con Floid.
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

  const preflightHeader = (
    <div className="space-y-3">
      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800">
        <Gift className="h-3.5 w-3.5" aria-hidden />
        Sin costo para ti en MaxRent
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Evaluación financiera</h1>
      <p className="text-gray-600 text-pretty max-w-2xl">
        Te ayudamos a conocer tu <strong>capacidad de compra</strong> con un análisis a través de{" "}
        <strong>Floid</strong>. <strong>No te cobramos</strong> por solicitar esta evaluación en el portal:
        es parte de tu proceso con MaxRent. Floid opera con sus propias fuentes; el resultado final
        depende de la información que ellos obtengan.
      </p>
    </div>
  );

  if (!evaluation) {
    return (
      <div className="max-w-2xl space-y-8">
        {preflightHeader}

        <StepsTimeline />

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gradient-to-r from-blue-50/80 to-white px-6 py-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Tu próximo paso</h2>
              <p className="text-sm text-gray-600">
                Revisa los datos, acepta el consentimiento y solicita tu evaluación gratuita.
              </p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {sendReceiveCards}

            <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-sm text-gray-600 flex items-start gap-2">
              <ArrowRight className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <span>
                La solicitud se ejecuta <strong>solo después</strong> de marcar las casillas. Suele tardar
                segundos; si Floid responde de forma asíncrona, verás el estado en proceso hasta tener el
                resultado.
              </span>
            </div>

            {dualConsentBlock}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:justify-end pt-1 gap-3">
              <button
                type="button"
                onClick={requestEvaluation}
                disabled={requesting || !previewChecked || !consentChecked}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {requesting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
                    Conectando con Floid…
                  </>
                ) : (
                  <>
                    Solicitar mi evaluación gratuita
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (evaluation.status === "PENDING" || evaluation.status === "PROCESSING") {
    return (
      <div className="max-w-lg space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Evaluación financiera</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-blue-50 rounded-full flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Procesando…</h3>
            <p className="text-sm text-gray-500 mt-1">
              Estamos obteniendo tu información con Floid. Suele tardar segundos; en algunos casos puede
              demorar más y completarse cuando Floid notifique el resultado.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (evaluation.status === "FAILED") {
    return (
      <div className="max-w-2xl space-y-8">
        {preflightHeader}

        <div className="rounded-xl border border-red-200 bg-red-50/30 p-5 flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-red-900">No pudimos completar tu evaluación</h3>
            <p className="text-sm text-gray-700 mt-1">
              {evaluation.errorMessage ||
                "Hubo un problema al procesar tu información. Puedes reintentar con una nueva solicitud gratuita."}
            </p>
          </div>
        </div>

        <StepsTimeline />

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Reintenta con confianza</h2>
          <p className="text-sm text-gray-600">
            Vuelve a revisar los datos que enviaremos y lo que esperamos recibir. El paso sigue siendo{" "}
            <strong>sin costo para ti</strong> en MaxRent.
          </p>

          {sendReceiveCards}
          {dualConsentBlock}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>
          )}

          <button
            type="button"
            onClick={requestEvaluation}
            disabled={requesting || !previewChecked || !consentChecked}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {requesting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
                Reintentando…
              </>
            ) : (
              <>
                Reintentar evaluación gratuita
                <ArrowRight className="h-4 w-4" aria-hidden />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  const riskColors = {
    LOW: { bg: "bg-green-100", text: "text-green-700", label: "Bajo" },
    MEDIUM: { bg: "bg-amber-100", text: "text-amber-700", label: "Medio" },
    HIGH: { bg: "bg-red-100", text: "text-red-700", label: "Alto" },
  };
  const risk = riskColors[evaluation.riskLevel as keyof typeof riskColors] || riskColors.MEDIUM;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Evaluación financiera</h1>
        <div className="flex items-center gap-1.5 text-sm text-green-700">
          <CheckCircle className="w-4 h-4" />
          Completada
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">Score</p>
            <p className="text-4xl font-bold text-gray-900">{evaluation.score ?? "—"}</p>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">Nivel de riesgo</p>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${risk.bg} ${risk.text}`}
            >
              {risk.label}
            </span>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">Monto máximo estimado</p>
            <p className="text-xl font-bold text-gray-900">
              {evaluation.maxApprovedAmount
                ? `$${Number(evaluation.maxApprovedAmount).toLocaleString("es-CL")}`
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {evaluation.summary && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Resumen</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{evaluation.summary}</p>
        </div>
      )}

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

      {evaluation.riskLevel !== "HIGH" && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          {evaluation.staffReservationApprovedAt ? (
            <>
              <p className="text-sm font-medium text-blue-800">
                El equipo habilitó reservas. Podés elegir propiedad en Oportunidades de inversión; el
                pago arranca al confirmar «Reservar».
              </p>
              <a
                href="/oportunidades"
                className="inline-block mt-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ir a Oportunidades de inversión →
              </a>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-blue-800">
                Tu evaluación está lista. El equipo revisará y habilitará el botón «Reservar» en el
                catálogo; no hace falta que hagas nada más acá.
              </p>
              <a
                href="/oportunidades"
                className="inline-block mt-2 text-sm font-medium text-blue-700 underline hover:text-blue-900"
              >
                Ver catálogo (solo lectura hasta la habilitación)
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}
