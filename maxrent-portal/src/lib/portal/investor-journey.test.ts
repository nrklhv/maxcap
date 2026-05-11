import { describe, expect, it } from "vitest";
import { buildInvestorJourney } from "./investor-journey";
import { isInvestorPerfilCompleteForPortal } from "./profile-labor";

const staffDate = new Date("2026-01-15T12:00:00.000Z");

// Índices: 0=perfil, 1=evaluación, 2=revisión, 3=reserva
const PERFIL = 0;
const EVAL = 1;
const REVISION = 2;
const RESERVA = 3;

describe("buildInvestorJourney", () => {
  it("legacy onboardingCompleted true sin labor: helper → false y journey deja Perfil en todo y next /perfil", () => {
    const profile = { onboardingCompleted: true as const, additionalData: {} };
    const derived = isInvestorPerfilCompleteForPortal(profile);
    expect(derived).toBe(false);
    const { steps, next } = buildInvestorJourney({
      onboardingCompleted: derived,
      evaluation: null,
      reservationCount: 0,
    });
    expect(steps[PERFIL].state).toBe("todo");
    expect(steps[EVAL].state).toBe("todo");
    expect(next?.href).toBe("/perfil");
    expect(next?.title).toBe("Completa tu perfil");
  });

  it("perfil incompleto aunque exista evaluación: siguiente paso sigue siendo perfil", () => {
    const { steps, next } = buildInvestorJourney({
      onboardingCompleted: false,
      evaluation: { status: "COMPLETED", staffReservationApprovedAt: null },
      reservationCount: 0,
    });
    expect(steps[PERFIL].state).toBe("todo");
    expect(steps[EVAL].state).toBe("todo");
    expect(steps[REVISION].state).toBe("todo");
    expect(next?.href).toBe("/perfil");
  });

  it("sin perfil: todos en todo y siguiente paso perfil", () => {
    const { steps, next } = buildInvestorJourney({
      onboardingCompleted: false,
      evaluation: null,
      reservationCount: 0,
    });
    expect(steps.map((s) => s.state)).toEqual(["todo", "todo", "todo", "todo"]);
    expect(steps[EVAL].caption).toBeUndefined();
    expect(next?.href).toBe("/perfil");
  });

  it("perfil listo sin evaluación: evaluación en todo, sugiere iniciar", () => {
    const { steps, next } = buildInvestorJourney({
      onboardingCompleted: true,
      evaluation: null,
      reservationCount: 0,
    });
    expect(steps[PERFIL].state).toBe("done");
    expect(steps[EVAL].state).toBe("todo");
    expect(steps[EVAL].caption).toBeUndefined();
    expect(steps[REVISION].state).toBe("todo");
    expect(steps[RESERVA].state).toBe("todo");
    expect(next?.href).toBe("/evaluacion");
    expect(next?.title).toContain("evaluación");
  });

  it("PROCESSING: paso evaluación activo, revisión todo, reserva en todo", () => {
    const { steps, next } = buildInvestorJourney({
      onboardingCompleted: true,
      evaluation: { status: "PROCESSING", staffReservationApprovedAt: null },
      reservationCount: 0,
    });
    expect(steps[EVAL].state).toBe("active");
    expect(steps[EVAL].caption).toBe("En proceso");
    expect(steps[REVISION].state).toBe("todo");
    expect(steps[RESERVA].state).toBe("todo");
    expect(next?.tone).toBe("wait");
  });

  it("COMPLETED sin staff: evaluación done, revisión active, reserva todo, mensaje habla de equipo", () => {
    const { steps, next } = buildInvestorJourney({
      onboardingCompleted: true,
      evaluation: { status: "COMPLETED", staffReservationApprovedAt: null },
      reservationCount: 0,
    });
    expect(steps[EVAL].state).toBe("done");
    expect(steps[EVAL].caption).toBe("Recibida");
    expect(steps[REVISION].state).toBe("active");
    expect(steps[REVISION].caption).toContain("Esperando equipo");
    expect(steps[RESERVA].state).toBe("todo");
    expect(next?.tone).toBe("wait");
    expect(next?.message).toMatch(/equipo|revisa/i);
  });

  it("COMPLETED con staff y sin reserva: revisión done, reserva active", () => {
    const { steps, next } = buildInvestorJourney({
      onboardingCompleted: true,
      evaluation: { status: "COMPLETED", staffReservationApprovedAt: staffDate },
      reservationCount: 0,
    });
    expect(steps[EVAL].state).toBe("done");
    expect(steps[REVISION].state).toBe("done");
    expect(steps[REVISION].caption).toBe("Aprobada por el equipo");
    expect(steps[RESERVA].state).toBe("active");
    expect(steps[RESERVA].caption).toBe("Habilitada");
    expect(next?.href).toBe("/oportunidades");
  });

  it("COMPLETED con staff y con reserva: reserva done y next celebra el final", () => {
    const { steps, next } = buildInvestorJourney({
      onboardingCompleted: true,
      evaluation: { status: "COMPLETED", staffReservationApprovedAt: staffDate },
      reservationCount: 1,
    });
    expect(steps[RESERVA].state).toBe("done");
    expect(steps[RESERVA].caption).toContain("reserva");
    expect(next?.tone).toBe("success");
  });

  it("FAILED: paso evaluación warn + siguiente paso reintentar", () => {
    const { steps, next } = buildInvestorJourney({
      onboardingCompleted: true,
      evaluation: { status: "FAILED", staffReservationApprovedAt: null },
      reservationCount: 0,
    });
    expect(steps[EVAL].state).toBe("warn");
    expect(steps[EVAL].caption).toBe("No completada");
    expect(steps[REVISION].state).toBe("todo");
    expect(next?.tone).toBe("warn");
    expect(next?.title).toMatch(/reintenta/i);
  });
});
