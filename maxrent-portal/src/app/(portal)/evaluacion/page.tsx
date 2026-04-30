/**
 * Investor portal — financial / credit evaluation (Floid Widget).
 *
 * Flujo:
 *   1. Inversionista marca dos consentimientos (revisión + autorización).
 *   2. Click en "Iniciar evaluación" → POST /api/floid/evaluate.
 *      Backend crea fila PENDING y devuelve `widgetUrl`.
 *   3. Frontend abre el widget en popup (Floid maneja Clave Única + 2FA + SII).
 *   4. Floid POSTea el reporte a /api/floid/callback → fila pasa a COMPLETED.
 *   5. Polling refresca la página y muestra el resumen + botón "Ver detalle".
 *
 * @route /evaluacion
 * @domain creditEvaluation
 */

"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Gift,
  ArrowRight,
  Shield,
  FileText,
  ExternalLink,
  X,
} from "lucide-react";
import { FLOID_CONSENT_VERSION } from "@/lib/floid/constants";
import { FloidReportSummary } from "@/components/floid/floid-report-summary";
import { FloidReportDetail } from "@/components/floid/floid-report-detail";

type Evaluation = {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  summary: string | null;
  downloadPdfUrl: string | null;
  rawResponse: unknown;
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
    { n: 1, title: "Acepta el consentimiento", desc: "Revisas y autorizas la consulta a Floid." },
    { n: 2, title: "Completa en la ventana de Floid", desc: "ClaveÚnica + Clave Tributaria SII (Floid lo gestiona)." },
    { n: 3, title: "Recibe tu resumen", desc: "Renta, tributario y deuda en una sola pantalla." },
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
  const [showDetail, setShowDetail] = useState(false);

  const loadEvaluation = useCallback(async () => {
    try {
      const res = await fetch("/api/floid/evaluations");
      if (res.ok) {
        const data = await res.json();
        setEvaluation(data.evaluations?.[0] ?? null);
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

  // Polling mientras el widget Floid procesa.
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
        setError(data.error || "Error al iniciar evaluación");
        return;
      }
      // Si hay widgetUrl, abrimos el widget Floid en popup.
      if (data.widgetUrl) {
        const popup = window.open(
          data.widgetUrl,
          "floid-widget",
          "width=520,height=720,resizable=yes,scrollbars=yes"
        );
        if (!popup) {
          setError(
            "Tu navegador bloqueó la ventana emergente. Permite popups para este sitio y vuelve a intentar."
          );
          return;
        }
      }
      setPreviewChecked(false);
      setConsentChecked(false);
      // Refrescamos para que el polling tome el nuevo estado.
      await loadEvaluation();
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
          Confirmo que <strong>revisé el RUT</strong> y la descripción de lo que se enviará a Floid y de
          lo que esperamos recibir, mostrada arriba en esta pantalla.
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
          Autorizo a <strong>MaxRent</strong> a iniciar la consulta con <strong>Floid</strong> para
          obtener mi reporte de renta (Superintendencia de Pensiones) e información tributaria (SII).
          Términos:{" "}
          <span className="font-mono text-xs text-gray-600">{FLOID_CONSENT_VERSION}</span>.
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
            Tu <strong>RUT</strong>:{" "}
            <span className="font-semibold text-gray-900">
              {profileLoading ? "cargando…" : formatRutForDisplay(profileRut)}
            </span>
          </li>
          <li>
            Un <strong>identificador interno</strong> de la solicitud (para correlacionar la respuesta).
          </li>
          <li className="text-gray-600">
            <strong>Tus claves no pasan por MaxRent</strong>: Clave Única y Clave Tributaria SII las
            ingresas directo en la ventana de Floid.
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
            <strong>Renta imponible mensual</strong> (Superintendencia de Pensiones).
          </li>
          <li>
            <strong>Carpeta tributaria</strong> con datos del contribuyente, bienes raíces y F22 (SII).
          </li>
          <li className="text-gray-600">
            Floid genera un <strong>PDF</strong> con el detalle completo y MaxRent lo guarda para tu
            consulta y la del equipo.
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
              <a
                href="/perfil"
                className="inline-block mt-3 text-sm font-medium text-amber-700 underline"
              >
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
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
        Evaluación financiera
      </h1>
      <p className="text-gray-600 text-pretty max-w-2xl">
        Te ayudamos a conocer tu <strong>capacidad de compra</strong> obteniendo tu información de
        renta y tributaria a través de <strong>Floid</strong>. Floid opera en su propio dominio: tus
        claves de Clave Única y SII no pasan por MaxRent.
      </p>
    </div>
  );

  // Sin evaluación → preflight + consent
  if (!evaluation) {
    return (
      <div className="max-w-2xl space-y-8">
        {preflightHeader}
        <StepsTimeline />

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gradient-to-r from-blue-50/80 to-white px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Tu próximo paso</h2>
            <p className="text-sm text-gray-600">
              Revisa los datos y consentimientos. Al continuar, abriremos la ventana de Floid donde
              ingresas tus claves.
            </p>
          </div>

          <div className="p-6 space-y-6">
            {sendReceiveCards}
            {dualConsentBlock}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                {error}
              </div>
            )}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={requestEvaluation}
                disabled={requesting || !previewChecked || !consentChecked}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {requesting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
                    Iniciando con Floid…
                  </>
                ) : (
                  <>
                    Iniciar evaluación
                    <ExternalLink className="h-4 w-4" aria-hidden />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // En curso (popup abierto / esperando callback)
  if (evaluation.status === "PENDING" || evaluation.status === "PROCESSING") {
    return (
      <div className="max-w-lg space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Evaluación financiera</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-blue-50 rounded-full flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Esperando información de Floid…</h3>
            <p className="text-sm text-gray-500 mt-1">
              Si aún no completaste el flujo en la ventana de Floid, hacelo ahora. Esta página se
              actualiza automáticamente cuando llegue tu reporte.
            </p>
          </div>
          <p className="text-xs text-gray-400">
            Si cerraste la ventana de Floid sin querer, espera unos segundos y volveremos a habilitar
            «Iniciar evaluación».
          </p>
        </div>
      </div>
    );
  }

  // Falló
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
                "Hubo un problema al procesar tu información. Puedes reintentar."}
            </p>
          </div>
        </div>
        <StepsTimeline />
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Reintenta</h2>
          {sendReceiveCards}
          {dualConsentBlock}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
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
                Reintentar evaluación
                <ArrowRight className="h-4 w-4" aria-hidden />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // COMPLETED — mostrar resumen + acciones
  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Tu reporte financiero</h1>
        <div className="flex items-center gap-1.5 text-sm text-green-700">
          <CheckCircle className="w-4 h-4" />
          Recibido
        </div>
      </div>

      <FloidReportSummary
        rawResponse={evaluation.rawResponse}
        fallbackSummary={evaluation.summary}
      />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setShowDetail(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <FileText className="h-4 w-4" aria-hidden />
          Ver detalle completo
        </button>
        {evaluation.downloadPdfUrl && (
          <a
            href={evaluation.downloadPdfUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            Descargar PDF (Floid)
          </a>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Clock className="w-3.5 h-3.5" />
        Recibido el{" "}
        {new Date(evaluation.completedAt || evaluation.requestedAt).toLocaleDateString("es-CL", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>

      {/* Estado de habilitación de reservas (gate del staff) */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        {evaluation.staffReservationApprovedAt ? (
          <>
            <p className="text-sm font-medium text-blue-800">
              El equipo habilitó reservas. Puedes elegir propiedad en Oportunidades de inversión.
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
              Tu información fue compartida exitosamente. Nuestro equipo la revisará y habilitará el
              botón «Reservar» en el catálogo. No hace falta que hagas nada más acá.
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

      {/* Modal con detalle completo */}
      {showDetail && (
        <DetailModal onClose={() => setShowDetail(false)}>
          <FloidReportDetail
            rawResponse={evaluation.rawResponse}
            downloadPdfUrl={evaluation.downloadPdfUrl}
            fallbackSummary={evaluation.summary}
            showRawJson={false}
          />
        </DetailModal>
      )}
    </div>
  );
}

function DetailModal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-3xl max-h-[90vh] overflow-auto rounded-t-2xl sm:rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Detalle del reporte</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
