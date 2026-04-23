import { describe, expect, it } from "vitest";
import { buildInvestorJourney } from "./investor-journey";
import { isInvestorPerfilCompleteForPortal } from "./profile-labor";

const staffDate = new Date("2026-01-15T12:00:00.000Z");

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
    expect(steps[0].state).toBe("todo");
    expect(steps[1].state).toBe("todo");
    expect(next).toEqual({ message: "Completa tu perfil para continuar.", href: "/perfil" });
  });

  it("perfil incompleto aunque exista evaluación: siguiente paso sigue siendo perfil", () => {
    const { steps, next } = buildInvestorJourney({
      onboardingCompleted: false,
      evaluation: { status: "COMPLETED", staffReservationApprovedAt: null },
      reservationCount: 0,
    });
    expect(steps[0].state).toBe("todo");
    expect(steps[1].state).toBe("todo");
    expect(next).toEqual({ message: "Completa tu perfil para continuar.", href: "/perfil" });
  });

  it("sin perfil: todos en todo y siguiente paso perfil", () => {
    const { steps, next } = buildInvestorJourney({
      onboardingCompleted: false,
      evaluation: null,
      reservationCount: 0,
    });
    expect(steps.map((s) => s.state)).toEqual(["todo", "todo", "todo"]);
    expect(steps[1].caption).toBeUndefined();
    expect(next).toEqual({ message: "Completa tu perfil para continuar.", href: "/perfil" });
  });

  it("perfil listo sin evaluación: evaluación en todo", () => {
    const { steps, next } = buildInvestorJourney({
      onboardingCompleted: true,
      evaluation: null,
      reservationCount: 0,
    });
    expect(steps[0].state).toBe("done");
    expect(steps[1].state).toBe("todo");
    expect(steps[1].caption).toBeUndefined();
    expect(steps[2].state).toBe("todo");
    expect(next?.href).toBe("/evaluacion");
  });

  it("PROCESSING: paso evaluación activo, reserva en todo", () => {
    const { steps } = buildInvestorJourney({
      onboardingCompleted: true,
      evaluation: { status: "PROCESSING", staffReservationApprovedAt: null },
      reservationCount: 0,
    });
    expect(steps[1].state).toBe("active");
    expect(steps[1].caption).toBeUndefined();
    expect(steps[2].state).toBe("todo");
  });

  it("COMPLETED sin staff: evaluación done + caption pendiente; reserva todo", () => {
    const { steps, next } = buildInvestorJourney({
      onboardingCompleted: true,
      evaluation: { status: "COMPLETED", staffReservationApprovedAt: null },
      reservationCount: 0,
    });
    expect(steps[1].state).toBe("done");
    expect(steps[1].caption).toBe("Completada · Pendiente habilitación equipo");
    expect(steps[2].state).toBe("todo");
    expect(next?.message).toContain("está completa");
    expect(next?.href).toBe("/oportunidades");
  });

  it("COMPLETED con staff y sin reserva: evaluación done + caption habilitada; reserva active", () => {
    const { steps, next } = buildInvestorJourney({
      onboardingCompleted: true,
      evaluation: { status: "COMPLETED", staffReservationApprovedAt: staffDate },
      reservationCount: 0,
    });
    expect(steps[1].state).toBe("done");
    expect(steps[1].caption).toBe("Completada · Habilitada para reservar");
    expect(steps[2].state).toBe("active");
    expect(next?.message).toMatch(/catálogo|reserva/i);
    expect(next?.href).toBe("/oportunidades");
  });

  it("COMPLETED con staff y con reserva: reserva done y sin siguiente paso", () => {
    const { steps, next } = buildInvestorJourney({
      onboardingCompleted: true,
      evaluation: { status: "COMPLETED", staffReservationApprovedAt: staffDate },
      reservationCount: 1,
    });
    expect(steps[2].state).toBe("done");
    expect(next).toBeNull();
  });

  it("FAILED: paso evaluación warn", () => {
    const { steps } = buildInvestorJourney({
      onboardingCompleted: true,
      evaluation: { status: "FAILED", staffReservationApprovedAt: null },
      reservationCount: 0,
    });
    expect(steps[1].state).toBe("warn");
    expect(steps[1].caption).toBeUndefined();
  });
});
