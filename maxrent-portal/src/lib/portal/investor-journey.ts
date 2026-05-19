/**
 * Pure helpers for the investor onboarding / purchase journey:
 *   Perfil → Evaluación → Revisión equipo → Reserva
 *
 * "Revisión equipo" es un paso intermedio entre evaluación completada y reserva habilitada:
 * staff debe revisar manualmente el reporte y aprobar (`staffReservationApprovedAt`).
 *
 * @domain portal
 */

export type InvestorJourneyStepId =
  | "perfil"
  | "evaluacion"
  | "revision"
  | "reserva";

export type InvestorJourneyStep = {
  id: InvestorJourneyStepId;
  label: string;
  href: string;
  /** Visual state for the stepper */
  state: "done" | "todo" | "active" | "warn";
  /** Secondary line under the label (e.g. completed vs approved for reserve). */
  caption?: string;
};

export type InvestorJourneyNext = {
  /** Título corto del próximo paso, en imperativo. */
  title: string;
  /** Descripción más larga del próximo paso. */
  message: string;
  href: string;
  /** Texto del CTA del botón (e.g. "Ir ahora", "Completar perfil"). */
  ctaLabel?: string;
  /** Severidad/color: 'primary' (azul) = paso normal, 'wait' (amber) = esperando algo externo, 'warn' (rojo) = problema. */
  tone?: "primary" | "wait" | "warn" | "success";
};

export type InvestorJourneyInput = {
  onboardingCompleted: boolean;
  /** Latest credit evaluation for the user, if any */
  evaluation: { status: string; staffReservationApprovedAt: Date | null } | null;
  /** Paid or confirmed reservations (same filter as «Mis reservas»). */
  reservationCount: number;
};

function evaluationCompletedNotApproved(
  evaluation: InvestorJourneyInput["evaluation"]
): boolean {
  return Boolean(
    evaluation?.status === "COMPLETED" && !evaluation.staffReservationApprovedAt
  );
}

function evaluationApproved(
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
  if (!perfilDone) return undefined;
  if (!evaluation) return undefined;
  if (evaluation.status === "PENDING" || evaluation.status === "PROCESSING") {
    return "En proceso";
  }
  if (evaluation.status === "FAILED") return "No completada";
  if (evaluation.status === "EXPIRED") return "Expiró";
  if (evaluation.status === "COMPLETED") return "Recibida";
  return undefined;
}

function revisionStepState(
  perfilDone: boolean,
  evaluation: InvestorJourneyInput["evaluation"]
): InvestorJourneyStep["state"] {
  if (!perfilDone || !evaluation || evaluation.status !== "COMPLETED") {
    return "todo";
  }
  if (evaluationApproved(evaluation)) return "done";
  // Evaluación lista pero staff aún no aprobó
  return "active";
}

function revisionCaption(
  evaluation: InvestorJourneyInput["evaluation"]
): string | undefined {
  if (!evaluation || evaluation.status !== "COMPLETED") return undefined;
  return evaluationApproved(evaluation)
    ? "Aprobada por el equipo"
    : "Esperando equipo (hasta 24h hábiles)";
}

/**
 * Builds ordered steps and the primary "what's next" hint for the investor UI.
 */
export function buildInvestorJourney(input: InvestorJourneyInput): {
  steps: InvestorJourneyStep[];
  next: InvestorJourneyNext | null;
} {
  const perfilDone = input.onboardingCompleted;
  const evalState = evaluationStepState(input.evaluation);
  const reserveGateOk = evaluationApproved(input.evaluation);
  const reservasDone = input.reservationCount > 0;

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
      state: !perfilDone ? "todo" : evalState,
      caption: evaluationCaption(input.evaluation, perfilDone),
    },
    {
      id: "revision",
      label: "Revisión",
      href: "/evaluacion",
      state: revisionStepState(perfilDone, input.evaluation),
      caption: revisionCaption(input.evaluation),
    },
    {
      id: "reserva",
      label: "Reserva",
      href: "/oportunidades",
      state: reservaState,
      caption: reservasDone
        ? `${input.reservationCount} reserva${input.reservationCount > 1 ? "s" : ""}`
        : reserveGateOk
          ? "Habilitada"
          : undefined,
    },
  ];

  // --- Construir el "siguiente paso" más prominente ---
  let next: InvestorJourneyNext | null = null;

  if (!perfilDone) {
    next = {
      title: "Completa tu perfil",
      message:
        "Necesitamos tus datos personales para iniciar la evaluación financiera.",
      href: "/perfil",
      ctaLabel: "Completar perfil",
      tone: "primary",
    };
  } else if (!input.evaluation) {
    next = {
      title: "Solicita tu evaluación financiera",
      message:
        "Obtenemos tu información de renta (Sup. Pensiones) e información tributaria (SII) en pocos minutos. Sin costo.",
      href: "/evaluacion",
      ctaLabel: "Iniciar evaluación",
      tone: "primary",
    };
  } else if (input.evaluation.status === "FAILED") {
    next = {
      title: "Reintenta tu evaluación",
      message:
        "La consulta no se completó. Puedes reintentarla sin costo.",
      href: "/evaluacion",
      ctaLabel: "Reintentar",
      tone: "warn",
    };
  } else if (input.evaluation.status === "EXPIRED") {
    next = {
      title: "Solicita una nueva evaluación",
      message: "Tu evaluación anterior expiró. Vuelve a iniciarla cuando quieras.",
      href: "/evaluacion",
      ctaLabel: "Solicitar evaluación",
      tone: "warn",
    };
  } else if (
    input.evaluation.status === "PENDING" ||
    input.evaluation.status === "PROCESSING"
  ) {
    next = {
      title: "Tu evaluación está en proceso",
      message:
        "Estamos esperando la respuesta del proveedor. Esta pantalla se actualiza sola cuando llega el reporte.",
      href: "/evaluacion",
      ctaLabel: "Ver estado",
      tone: "wait",
    };
  } else if (evaluationCompletedNotApproved(input.evaluation)) {
    next = {
      title: "Tu reporte está en revisión",
      message:
        "Recibimos tu evaluación. Nuestro equipo la revisa en menos de 24h hábiles y te habilita las reservas. Te avisaremos por correo.",
      href: "/oportunidades",
      ctaLabel: "Ver catálogo mientras tanto",
      tone: "wait",
    };
  } else if (!reservasDone) {
    next = {
      title: "Reserva tu propiedad",
      message:
        "Tu acceso está habilitado. Elige una propiedad del catálogo y reserva.",
      href: "/oportunidades",
      ctaLabel: "Ver oportunidades",
      tone: "primary",
    };
  } else {
    next = {
      title: "¡Listo!",
      message: "Estás al día con todos los pasos. Puedes seguir explorando.",
      href: "/oportunidades",
      ctaLabel: "Ver oportunidades",
      tone: "success",
    };
  }

  return { steps, next };
}
