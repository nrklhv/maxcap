import { NextResponse } from "next/server";
import { requireApprovedBroker } from "@/lib/api-auth";
import * as sponsorBrokerService from "@/lib/services/sponsor-broker.service";

/**
 * Approved broker: list investor accounts linked via `sponsorBrokerUserId`.
 *
 * @source GET /api/broker/sponsored-investors
 */
export async function GET() {
  const session = await requireApprovedBroker();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const rows = await sponsorBrokerService.listSponsoredInvestorsForBroker(session.user.id);
    const investors = rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.createdAt.toISOString(),
    }));

    return NextResponse.json({ investors });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    const prismaCode =
      typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : "";
    console.error("[GET /api/broker/sponsored-investors]", e);
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? "No se pudo cargar inversionistas. Verificá migraciones Prisma (sponsorBroker)."
            : "No se pudo cargar inversionistas.",
        ...(process.env.NODE_ENV === "development" ? { debug: { prismaCode, errMsg: errMsg.slice(0, 300) } } : {}),
      },
      { status: 500 }
    );
  }
}
