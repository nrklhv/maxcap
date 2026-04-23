/**
 * Unit tests for Floid JSON → portal result mapping (contract-agnostic shapes).
 *
 * @domain creditEvaluation
 * @see parseFloidPayload — extend cases when Floid returns new field names
 */

import { describe, expect, it } from "vitest";
import { looksLikeFloidAsyncAck, parseFloidPayload } from "./parse-floid-response";

describe("parseFloidPayload", () => {
  it("returns null for empty or non-object", () => {
    expect(parseFloidPayload(null)).toBeNull();
    expect(parseFloidPayload(undefined)).toBeNull();
    expect(parseFloidPayload("ok")).toBeNull();
    expect(parseFloidPayload({})).toBeNull();
  });

  it("maps top-level score and message", () => {
    const r = parseFloidPayload({
      score: 720,
      msg: "Aprobado",
    });
    expect(r).not.toBeNull();
    expect(r!.score).toBe(720);
    expect(r!.riskLevel).toBe("LOW");
    expect(r!.summary).toBe("Aprobado");
    expect(r!.maxApprovedAmount).toBeGreaterThan(0);
  });

  it("reads score from nested data", () => {
    const r = parseFloidPayload({
      data: { score: 610, msg: "Nested OK" },
    });
    expect(r?.score).toBe(610);
    expect(r?.riskLevel).toBe("MEDIUM");
    expect(r?.summary).toBe("Nested OK");
  });

  it("reads score from resultado (common Spanish key)", () => {
    const r = parseFloidPayload({
      resultado: { score: 580 },
      message: "Desde resultado",
    });
    expect(r?.score).toBe(580);
    expect(r?.summary).toBe("Desde resultado");
  });

  it("uses explicit risk token when present", () => {
    const r = parseFloidPayload({
      score: 400,
      risk_level: "BAJO",
      message: "x",
    });
    expect(r?.riskLevel).toBe("LOW");
  });
});

describe("looksLikeFloidAsyncAck", () => {
  it("false when full result is parseable", () => {
    expect(looksLikeFloidAsyncAck({ score: 700, msg: "done" })).toBe(false);
  });

  it("true when code 200 and no score payload", () => {
    expect(looksLikeFloidAsyncAck({ code: "200", msg: "received" })).toBe(true);
  });

  it("true when case id present without score", () => {
    expect(looksLikeFloidAsyncAck({ caseid: "abc-123", status: "pending" })).toBe(true);
  });

  it("false for empty object", () => {
    expect(looksLikeFloidAsyncAck({})).toBe(false);
  });
});
