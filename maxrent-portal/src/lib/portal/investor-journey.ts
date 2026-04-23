/**
 * Pure helpers for the investor onboarding / purchase journey (perfil → evaluación → reserva).
 * Used by the portal layout strip and can be reused by the dashboard or APIs.
 *
 * Evaluación "completada" = Floid devolvió resultado (`COMPLETED`). La habilitación para
 * reservar en catálogo es aparte (`staffReservationApprovedAt`).
 *
 * @domain portal
 */

export type InvestorJourneyStep = {
  id: "perfil" | "evaluacion" | "reserva";
  label: string;
  href: string;
  /** Visual state for the stepper */
  state: "done" | "todo" | "active" | "warn";
  /** Secondary line under the label (e.g. completed vs approved for reserve). */
  caption?: string;
};

export type InvestorJourneyNext = {
  message: string;
  href: string;
};

export type InvestorJourneyInput = {
  onboardingCompleted: boolean;
  /** Latest credit evaluation for the user, if any */
  evaluation: { status: string; staffReservationApprovedAt: Date | null } | null;
  /** Paid or confirmed reservations (same filter as «Mis reservas»). */
  reservationCount: number;
};

function evaluationAllowsReserve(
  evaluation: InvestorJourneyInput["evaluation"]
): boolean {
  return Boolean(
    evaluation?.status === "COMPLETED" && evaluation.staffReservationApprovedAt
  );
}

function evaluationStepState(
  evaluation: InvestorJourneyInput["evaluation"]
): InvestorJourneyStep["state"] {
  if (!evaluation) return "todo";
  switch (evaluation.status) {
    case "COMPLETED":
      return "done";
    case "FAILED":
    case "EXPIRED":
      return "warn";
    case "PENDING":
    case "PROCESSING":
      return "active";
    default:
      return "todo";
  }
}

function evaluationCaption(
  evaluation: InvestorJourneyInput["evaluation"],
  perfilDone: boolean
): string | undefined {
  if (!perfilDone || !evaluation || evaluation.status !== "COMPLETED") {
    return undefined;
  }
  return evaluation.staffReservationApprovedAt
    ? "Completada · Habilitada para reservar"
    : "Completada · Pendiente habilitación equipo";
}

/**
 * Builds ordered steps and the primary “what’s next” hint for the investor UI.
 */
export function buildInvestorJourney(input: InvestorJourneyInput): {
  steps: InvestorJourneyStep[];
  next: InvestorJourneyNext | null;
} {
  const perfilDone = input.onboardingCompleted;
  const evalState = evaluationStepState(input.evaluation);
  const reserveGateOk = evaluationAllowsReserve(input.evaluation);
  const reservasDone = input.reservationCount > 0;

  const evalCaption = evaluationCaption(input.evaluation, perfilDone);

  const reservaState: InvestorJourneyStep["state"] =
    !perfilDone || !reserveGateOk ? "todo" : reservasDone ? "done" : "active";

  const steps: InvestorJourneyStep[] = [
    {
      id: "perfil",
      label: "Perfil",
      href: "/perfil",
      state: perfilDone ? "done" : "todo",
    },
    {
      id: "evaluacion",
      label: "Evaluación",
      href: "/evaluacion",
      state: !perfilDone ? "todo" : evalState === "done" ? "done" : evalState,
      caption: evalCaption,
    },
    {
      id: "reserva",
      label: "Reserva",
      href: "/oportunidades",
      state: reservaState,
    },
  ];

  let next: InvestorJourneyNext | null = null;

  if (!perfilDone) {
    next = { message: "Completa tu perfil para continuar.", href: "/perfil" };
  } else if (
    !input.evaluation ||
    input.evaluation.status === "FAILED" ||
    input.evaluation.status === "EXPIRED"
  ) {
    next = {
      message:
        input.evaluation?.status === "FAILED"
          ? "Tu evaluación no se completó. Reinténtala o contacta a un asesor."
          : input.evaluation?.status === "EXPIRED"
            ? "Tu evaluación expiró. Solicita una nueva evaluación."
            : "Solicita tu evaluación financiera para conocer tu capacidad de compra.",
      href: "/evaluacion",
    };
  } else if (input.evaluation.status === "PENDING" || input.evaluation.status === "PROCESSING") {
    next = {
      message: "Tu evaluación está en proceso; te avisamos aquí cuando termine.",
      href: "/evaluacion",
    };
  } else if (
    input.evaluation.status === "COMPLETED" &&
    !input.evaluation.staffReservationApprovedAt
  ) {
    next = {
      message:
        "Tu evaluación crediticia está completa. El equipo revisará y habilitará el botón Reservar en el catálogo.",
      href: "/oportunidades",
    };
  } else if (!reservasDone) {
    next = {
      message: "Explora el catálogo y reserva la propiedad que te interese.",
      href: "/oportunidades",
    };
  }

  return { steps, next };
}
