import { describe, expect, it } from "vitest";
import { reservationSchema } from "./validations";

describe("reservationSchema", () => {
  it("acepta una reserva de propiedad (Producto 1)", () => {
    const r = reservationSchema.safeParse({ propertyId: "p_123" });
    expect(r.success).toBe(true);
  });

  it("acepta una reserva de unidad del pool (Producto 2)", () => {
    const r = reservationSchema.safeParse({ poolUnitId: "u_456" });
    expect(r.success).toBe(true);
  });

  it("rechaza body sin ninguno de los dos targets", () => {
    const r = reservationSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it("rechaza body con ambos targets (XOR)", () => {
    const r = reservationSchema.safeParse({
      propertyId: "p_123",
      poolUnitId: "u_456",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza target con string vacío", () => {
    expect(reservationSchema.safeParse({ propertyId: "" }).success).toBe(false);
    expect(reservationSchema.safeParse({ poolUnitId: "" }).success).toBe(false);
  });

  it("acepta evaluationId opcional junto a un target válido", () => {
    const r = reservationSchema.safeParse({
      poolUnitId: "u_456",
      evaluationId: "eval_789",
    });
    expect(r.success).toBe(true);
  });
});
