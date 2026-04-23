/**
 * Staff investor listing/detail — Prisma access is mocked; asserts query filters and guards.
 *
 * @domain maxrent-portal
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { getInvestorDetailForStaff, listInvestorsForStaff } from "./investor.service";

describe("listInvestorsForStaff", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findMany).mockReset();
  });

  it("lists users with canInvest true", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
    await listInvestorsForStaff();
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { canInvest: true },
      })
    );
  });
});

describe("getInvestorDetailForStaff", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockReset();
  });

  it("returns null when user missing", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    await expect(getInvestorDetailForStaff("missing")).resolves.toBeNull();
  });

  it("returns null when canInvest is false", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "u1",
      canInvest: false,
      creditEvaluations: [],
    } as never);
    await expect(getInvestorDetailForStaff("u1")).resolves.toBeNull();
  });

  it("returns user when canInvest true even with no evaluations", async () => {
    const row = {
      id: "u1",
      canInvest: true,
      creditEvaluations: [],
      profile: null,
      sponsorBroker: null,
    };
    vi.mocked(prisma.user.findUnique).mockResolvedValue(row as never);
    await expect(getInvestorDetailForStaff("u1")).resolves.toEqual(row);
  });
});
