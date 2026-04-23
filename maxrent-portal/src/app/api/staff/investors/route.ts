import { NextResponse } from "next/server";
import { requireStaffSuperAdmin } from "@/lib/api-auth";
import * as investorService from "@/lib/services/investor.service";

/**
 * Lists portal investors (`canInvest`) for staff (latest evaluation per user when present).
 *
 * @source GET /api/staff/investors
 */
export async function GET() {
  const session = await requireStaffSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const rows = await investorService.listInvestorsForStaff();
    const investors = rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      createdAt: r.createdAt.toISOString(),
      sponsorBroker: r.sponsorBroker
        ? {
            id: r.sponsorBroker.id,
            email: r.sponsorBroker.email,
            name: r.sponsorBroker.name,
          }
        : null,
      evaluation: r.evaluation
        ? {
            id: r.evaluation.id,
            status: r.evaluation.status,
            requestedAt: r.evaluation.requestedAt.toISOString(),
            completedAt: r.evaluation.completedAt?.toISOString() ?? null,
            staffReservationApprovedAt: r.evaluation.staffReservationApprovedAt?.toISOString() ?? null,
          }
        : null,
    }));

    return NextResponse.json({ investors });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    const prismaCode =
      typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : "";
    console.error("[GET /api/staff/investors]", e);
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? "No se pudo listar inversionistas. Si acabás de actualizar el código, ejecutá `node scripts/prisma-with-merged-env.cjs migrate deploy` (columnas sponsorBroker)."
            : "No se pudo listar inversionistas.",
        ...(process.env.NODE_ENV === "development" ? { debug: { prismaCode, errMsg: errMsg.slice(0, 300) } } : {}),
      },
      { status: 500 }
    );
  }
}
