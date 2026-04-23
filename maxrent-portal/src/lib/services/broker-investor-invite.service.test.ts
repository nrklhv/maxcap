import { describe, expect, it } from "vitest";
import {
  inviteLinkStatusLabel,
  normalizeOptionalInviteeEmail,
  resolveInviteDisplayStatus,
  resolveSponsoredInvestorProgressLabel,
} from "./broker-investor-invite.service";

describe("normalizeOptionalInviteeEmail", () => {
  it("returns null for empty or whitespace", () => {
    expect(normalizeOptionalInviteeEmail(null)).toBeNull();
    expect(normalizeOptionalInviteeEmail(undefined)).toBeNull();
    expect(normalizeOptionalInviteeEmail("   ")).toBeNull();
  });

  it("trims and lowercases", () => {
    expect(normalizeOptionalInviteeEmail("  Test@Example.COM ")).toBe("test@example.com");
  });
});

describe("resolveInviteDisplayStatus", () => {
  const future = new Date("2030-01-01T00:00:00.000Z");
  const past = new Date("2020-01-01T00:00:00.000Z");
  const now = new Date("2026-06-15T12:00:00.000Z");

  it("COMPLETED in DB stays completed", () => {
    expect(
      resolveInviteDisplayStatus({ status: "COMPLETED", expiresAt: past, now })
    ).toBe("COMPLETED");
  });

  it("EXPIRED in DB stays expired", () => {
    expect(resolveInviteDisplayStatus({ status: "EXPIRED", expiresAt: future, now })).toBe("EXPIRED");
  });

  it("PENDING with past expiresAt shows EXPIRED", () => {
    expect(resolveInviteDisplayStatus({ status: "PENDING", expiresAt: past, now })).toBe("EXPIRED");
  });

  it("PENDING with future expiresAt shows PENDING", () => {
    expect(resolveInviteDisplayStatus({ status: "PENDING", expiresAt: future, now })).toBe("PENDING");
  });
});

describe("inviteLinkStatusLabel", () => {
  it("maps display keys to Spanish", () => {
    expect(inviteLinkStatusLabel("PENDING")).toBe("Pendiente");
    expect(inviteLinkStatusLabel("COMPLETED")).toBe("Usada");
    expect(inviteLinkStatusLabel("EXPIRED")).toBe("Expirada");
  });
});

describe("resolveSponsoredInvestorProgressLabel", () => {
  it("profile first", () => {
    expect(
      resolveSponsoredInvestorProgressLabel({
        onboardingCompleted: false,
        evaluation: { status: "COMPLETED", staffReservationApprovedAt: new Date() },
      })
    ).toBe("Perfil incompleto");
  });

  it("no evaluation after profile", () => {
    expect(
      resolveSponsoredInvestorProgressLabel({
        onboardingCompleted: true,
        evaluation: null,
      })
    ).toBe("Evaluación pendiente");
  });

  it("processing", () => {
    expect(
      resolveSponsoredInvestorProgressLabel({
        onboardingCompleted: true,
        evaluation: { status: "PROCESSING", staffReservationApprovedAt: null },
      })
    ).toBe("Evaluación en proceso");
  });

  it("completed without staff approval", () => {
    expect(
      resolveSponsoredInvestorProgressLabel({
        onboardingCompleted: true,
        evaluation: { status: "COMPLETED", staffReservationApprovedAt: null },
      })
    ).toBe("Esperando aprobación staff");
  });

  it("completed with staff approval", () => {
    expect(
      resolveSponsoredInvestorProgressLabel({
        onboardingCompleted: true,
        evaluation: { status: "COMPLETED", staffReservationApprovedAt: new Date() },
      })
    ).toBe("Listo para reservar");
  });
});
