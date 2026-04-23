/**
 * Compact horizontal stepper for the investor journey (perfil → evaluación → reserva)
 * plus a short “what’s next” line with a link. Rendered at the top of the portal main column.
 *
 * @domain portal
 * @see buildInvestorJourney — supplies `steps` and `next`
 */

import Link from "next/link";
import type { InvestorJourneyNext, InvestorJourneyStep } from "@/lib/portal/investor-journey";

export interface InvestorJourneyStripProps {
  steps: InvestorJourneyStep[];
  next: InvestorJourneyNext | null;
}

function circleClasses(state: InvestorJourneyStep["state"]): string {
  switch (state) {
    case "done":
      return "bg-blue-600 text-white border-blue-600";
    case "active":
      return "bg-amber-50 text-amber-800 border-amber-400 ring-2 ring-amber-200";
    case "warn":
      return "bg-red-50 text-red-700 border-red-400";
    default:
      return "bg-white text-gray-500 border-gray-300";
  }
}

function labelColorClass(state: InvestorJourneyStep["state"]): string {
  switch (state) {
    case "done":
      return "text-blue-800";
    case "active":
      return "text-amber-900";
    case "warn":
      return "text-red-800";
    default:
      return "text-gray-700";
  }
}

export function InvestorJourneyStrip({ steps, next }: InvestorJourneyStripProps) {
  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        Tu proceso
      </p>
      <div className="flex flex-wrap items-center gap-2 sm:gap-0">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            {index > 0 && (
              <div
                className={`hidden sm:block w-6 lg:w-10 h-0.5 mx-1 ${
                  steps[index - 1]?.state === "done" ? "bg-blue-400" : "bg-gray-300"
                }`}
                aria-hidden
              />
            )}
            <Link
              href={step.href}
              className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-white/80 transition-colors max-w-[11rem] sm:max-w-none"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${circleClasses(
                  step.state
                )}`}
              >
                {index + 1}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className={`text-sm font-medium ${labelColorClass(step.state)}`}>
                  {step.label}
                </span>
                {step.caption ? (
                  <span className="text-xs text-gray-600 leading-snug">{step.caption}</span>
                ) : null}
              </span>
            </Link>
          </div>
        ))}
      </div>
      {next ? (
        <p className="mt-3 text-sm text-gray-700 border-t border-gray-200 pt-3">
          <span className="font-medium text-gray-900">Siguiente paso: </span>
          {next.message}{" "}
          <Link href={next.href} className="text-blue-700 font-medium underline underline-offset-2">
            Ir ahora
          </Link>
        </p>
      ) : (
        <p className="mt-3 text-sm text-gray-600 border-t border-gray-200 pt-3">
          Estás al día con los pasos principales. Puedes revisar tu perfil, evaluación o reservas cuando quieras.
        </p>
      )}
    </div>
  );
}
