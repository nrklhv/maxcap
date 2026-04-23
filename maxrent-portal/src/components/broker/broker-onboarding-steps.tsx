/**
 * Visual stepper for broker onboarding: commercial profile → submit application → staff review.
 *
 * @domain maxrent-portal / broker
 * @see brokerAccessStatus on User
 * @see userHasCompleteBrokerProfile — step 1 completion
 */

import { getBrokerApplicationRequirementsCopy } from "@/lib/broker/broker-application-copy";

export type BrokerAccessStatusProp = "PENDING" | "APPROVED" | "REJECTED" | null;

export interface BrokerOnboardingStepsProps {
  brokerAccessStatus: BrokerAccessStatusProp;
  profileComplete: boolean;
  /** When true, show the checklist of fields (uses shared copy from broker-application-copy). */
  showRequirements?: boolean;
  className?: string;
}

type StepKey = "profile" | "submit" | "review";

function stepStates(params: {
  brokerAccessStatus: BrokerAccessStatusProp;
  profileComplete: boolean;
}): Record<StepKey, "done" | "current" | "upcoming"> {
  const { brokerAccessStatus, profileComplete } = params;

  if (brokerAccessStatus === "APPROVED") {
    return { profile: "done", submit: "done", review: "done" };
  }
  if (brokerAccessStatus === "PENDING") {
    return { profile: "done", submit: "done", review: "current" };
  }
  if (!profileComplete) {
    return { profile: "current", submit: "upcoming", review: "upcoming" };
  }
  // null or REJECTED: profile done, must (re)submit
  return { profile: "done", submit: "current", review: "upcoming" };
}

const stepMeta: { key: StepKey; title: string; description: string }[] = [
  {
    key: "profile",
    title: "Perfil comercial completo",
    description: "Completá y guardá los datos comerciales en «Perfil broker» (columna derecha).",
  },
  {
    key: "submit",
    title: "Enviar solicitud de acceso",
    description: "Desde «Enviar solicitud» confirmás que querés que MaxRent revise tu cuenta.",
  },
  {
    key: "review",
    title: "Revisión por MaxRent",
    description: "El equipo valida tu información. Cuando seas aprobado, verás Oportunidades e Inversionistas en el menú.",
  },
];

export function BrokerOnboardingSteps({
  brokerAccessStatus,
  profileComplete,
  showRequirements = false,
  className = "",
}: BrokerOnboardingStepsProps) {
  const states = stepStates({ brokerAccessStatus, profileComplete });
  const requirements = showRequirements ? getBrokerApplicationRequirementsCopy() : [];

  return (
    <section
      className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${className}`.trim()}
      aria-labelledby="broker-onboarding-heading"
    >
      <h2
        id="broker-onboarding-heading"
        className="text-sm font-semibold text-gray-900 uppercase tracking-wide"
      >
        Pasos para acceder como broker
      </h2>
      <ol className="mt-4 flex flex-row divide-x divide-gray-200">
        {stepMeta.map(({ key, title, description }) => {
          const state = states[key];
          const isDone = state === "done";
          const isCurrent = state === "current";
          return (
            <li
              key={key}
              className="flex min-w-0 flex-1 flex-col items-center gap-2 px-2 text-center first:pl-0 last:pr-0 sm:px-4 sm:first:pl-0 sm:last:pr-0"
              aria-current={isCurrent ? "step" : undefined}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isDone
                    ? "bg-emerald-600 text-white"
                    : isCurrent
                      ? "bg-broker-accent text-white ring-2 ring-broker-accent-soft ring-offset-2"
                      : "bg-gray-100 text-gray-400"
                }`}
                aria-hidden
              >
                {isDone ? "✓" : stepMeta.findIndex((s) => s.key === key) + 1}
              </span>
              <div className="min-w-0">
                <p
                  className={`text-[11px] font-semibold leading-tight sm:text-sm ${isCurrent ? "text-broker-navy" : "text-gray-800"}`}
                >
                  {title}
                  {key === "submit" && brokerAccessStatus === "PENDING" ? (
                    <span className="block font-normal text-emerald-700 sm:inline sm:ml-1">(enviada)</span>
                  ) : null}
                  {key === "review" && brokerAccessStatus === "APPROVED" ? (
                    <span className="block font-normal text-emerald-700 sm:inline sm:ml-1">(listo)</span>
                  ) : null}
                </p>
                <p className="mt-1 text-[10px] leading-snug text-gray-600 sm:text-xs sm:leading-relaxed">
                  {description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {showRequirements && requirements.length > 0 ? (
        <div className="mt-5 border-t border-gray-100 pt-4">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Requisitos del perfil comercial
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-gray-600">
            {requirements.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
