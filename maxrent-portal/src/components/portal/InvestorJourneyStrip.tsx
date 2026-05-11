/**
 * Stepper visual del viaje del inversionista (Perfil → Evaluación → Revisión → Reserva).
 * Aparece en el top de todas las páginas bajo /(portal)/.
 *
 * Render:
 *   - 4 círculos con icono + label + caption opcional
 *   - Conectores entre pasos (azul si el anterior está done)
 *   - Card "Siguiente paso" debajo del stepper con título + descripción + CTA
 *
 * @domain portal
 * @see buildInvestorJourney — supplies `steps` y `next`
 */

import Link from "next/link";
import {
  ArrowRight,
  Check,
  ClipboardCheck,
  FileSearch,
  Loader2,
  Sparkles,
  TriangleAlert,
  User,
  KeyRound,
  Home,
} from "lucide-react";
import type {
  InvestorJourneyNext,
  InvestorJourneyStep,
  InvestorJourneyStepId,
} from "@/lib/portal/investor-journey";

export interface InvestorJourneyStripProps {
  steps: InvestorJourneyStep[];
  next: InvestorJourneyNext | null;
}

const STEP_ICONS: Record<InvestorJourneyStepId, typeof User> = {
  perfil: User,
  evaluacion: FileSearch,
  revision: ClipboardCheck,
  reserva: Home,
};

function circleClasses(state: InvestorJourneyStep["state"]): string {
  switch (state) {
    case "done":
      return "bg-blue-600 text-white border-blue-600";
    case "active":
      return "bg-amber-50 text-amber-800 border-amber-400 ring-4 ring-amber-100 shadow-sm";
    case "warn":
      return "bg-red-50 text-red-700 border-red-400 ring-4 ring-red-100";
    default:
      return "bg-white text-gray-400 border-gray-300";
  }
}

function labelColorClass(state: InvestorJourneyStep["state"]): string {
  switch (state) {
    case "done":
      return "text-blue-800";
    case "active":
      return "text-amber-900 font-semibold";
    case "warn":
      return "text-red-800 font-semibold";
    default:
      return "text-gray-600";
  }
}

function captionColorClass(state: InvestorJourneyStep["state"]): string {
  switch (state) {
    case "done":
      return "text-blue-700";
    case "active":
      return "text-amber-800";
    case "warn":
      return "text-red-700";
    default:
      return "text-gray-500";
  }
}

/** Color y borde del card "Siguiente paso" según el tono. */
function nextToneClasses(tone: InvestorJourneyNext["tone"]): {
  container: string;
  badge: string;
  cta: string;
} {
  switch (tone) {
    case "wait":
      return {
        container: "border-amber-200 bg-amber-50/60",
        badge: "bg-amber-100 text-amber-900",
        cta: "bg-amber-700 hover:bg-amber-800 text-white",
      };
    case "warn":
      return {
        container: "border-red-200 bg-red-50/60",
        badge: "bg-red-100 text-red-900",
        cta: "bg-red-700 hover:bg-red-800 text-white",
      };
    case "success":
      return {
        container: "border-emerald-200 bg-emerald-50/60",
        badge: "bg-emerald-100 text-emerald-900",
        cta: "bg-emerald-700 hover:bg-emerald-800 text-white",
      };
    case "primary":
    default:
      return {
        container: "border-blue-200 bg-blue-50/60",
        badge: "bg-blue-100 text-blue-900",
        cta: "bg-blue-700 hover:bg-blue-800 text-white",
      };
  }
}

function NextToneIcon({ tone }: { tone: InvestorJourneyNext["tone"] }) {
  switch (tone) {
    case "wait":
      return <Loader2 className="h-4 w-4 animate-spin" aria-hidden />;
    case "warn":
      return <TriangleAlert className="h-4 w-4" aria-hidden />;
    case "success":
      return <Sparkles className="h-4 w-4" aria-hidden />;
    case "primary":
    default:
      return <ArrowRight className="h-4 w-4" aria-hidden />;
  }
}

function StepIcon({ step, n }: { step: InvestorJourneyStep; n: number }) {
  // Si está done, mostramos check ✓. Si está active, mostramos un spinner sutil
  // (excepto en "perfil" donde no aplica). Si está warn, alerta. Si todo, número.
  if (step.state === "done") {
    return <Check className="h-4 w-4" aria-hidden strokeWidth={3} />;
  }
  if (step.state === "warn") {
    return <TriangleAlert className="h-4 w-4" aria-hidden />;
  }
  if (step.state === "active") {
    // "Revisión" en active = esperando staff, mostramos icono de llave.
    // "Evaluación" en active = procesando con Floid, mostramos loader.
    if (step.id === "revision") {
      return <KeyRound className="h-4 w-4" aria-hidden />;
    }
    return <Loader2 className="h-4 w-4 animate-spin" aria-hidden />;
  }
  // todo → icono del paso o número
  const Icon = STEP_ICONS[step.id];
  if (Icon) return <Icon className="h-4 w-4" aria-hidden />;
  return <span className="text-xs font-bold">{n}</span>;
}

export function InvestorJourneyStrip({ steps, next }: InvestorJourneyStripProps) {
  return (
    <div className="mb-6 space-y-3">
      {/* Stepper horizontal con iconos */}
      <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-3">
          Tu proceso
        </p>
        <div className="flex items-start justify-between gap-1 sm:gap-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="flex items-start flex-1 min-w-0"
            >
              <Link
                href={step.href}
                className="flex flex-col items-center gap-1.5 min-w-0 group flex-1"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all ${circleClasses(
                    step.state
                  )}`}
                >
                  <StepIcon step={step} n={index + 1} />
                </span>
                <span className="flex flex-col items-center text-center min-w-0 px-1">
                  <span
                    className={`text-xs sm:text-sm leading-tight ${labelColorClass(step.state)}`}
                  >
                    {step.label}
                  </span>
                  {step.caption && (
                    <span
                      className={`text-[10px] sm:text-[11px] leading-snug mt-0.5 line-clamp-2 ${captionColorClass(step.state)}`}
                    >
                      {step.caption}
                    </span>
                  )}
                </span>
              </Link>
              {index < steps.length - 1 && (
                <div
                  className={`hidden sm:block flex-shrink-0 h-0.5 mt-[18px] mx-1 transition-colors ${
                    step.state === "done" ? "bg-blue-400" : "bg-gray-200"
                  }`}
                  style={{ width: "1.5rem" }}
                  aria-hidden
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Card "Siguiente paso" */}
      {next && <NextActionCard next={next} />}
    </div>
  );
}

function NextActionCard({ next }: { next: InvestorJourneyNext }) {
  const tone = nextToneClasses(next.tone);
  return (
    <div
      className={`rounded-2xl border ${tone.container} px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm`}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <span className={`shrink-0 rounded-lg p-2 ${tone.badge}`}>
          <NextToneIcon tone={next.tone} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
            Siguiente paso
          </p>
          <p className="text-base font-semibold text-gray-900 mt-0.5">
            {next.title}
          </p>
          <p className="text-sm text-gray-700 mt-1 leading-snug">
            {next.message}
          </p>
        </div>
      </div>
      <Link
        href={next.href}
        className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${tone.cta}`}
      >
        {next.ctaLabel ?? "Ir ahora"}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}
