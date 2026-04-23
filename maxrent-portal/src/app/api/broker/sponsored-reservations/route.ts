import { NextResponse } from "next/server";
import { requireApprovedBroker } from "@/lib/api-auth";
import * as sponsorBrokerService from "@/lib/services/sponsor-broker.service";

/**
 * Approved broker: reservations of sponsored investors. Default filter = active statuses only.
 *
 * @source GET /api/broker/sponsored-reservations?activeOnly=true|false
 */
export async function GET(req: Request) {
  const session = await requireApprovedBroker();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("activeOnly") !== "false";

  try {
    const rows = await sponsorBrokerService.listSponsoredReservationsForBroker(session.user.id, {
      activeOnly,
    });

    const reservations = rows.map((r) => ({
      id: r.id,
      status: r.status,
      propertyId: r.propertyId,
      propertyName: r.propertyName,
      amount: r.amount.toString(),
      currency: r.currency,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      expiresAt: r.expiresAt?.toISOString() ?? null,
      paidAt: r.paidAt?.toISOString() ?? null,
      investor: {
        id: r.user.id,
        email: r.user.email,
        name: r.user.name,
      },
    }));

    return NextResponse.json({ reservations, activeOnly });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    const prismaCode =
      typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : "";
    console.error("[GET /api/broker/sponsored-reservations]", e);
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? "No se pudo cargar reservas. Verificá migraciones Prisma (sponsorBroker)."
            : "No se pudo cargar reservas.",
        ...(process.env.NODE_ENV === "development" ? { debug: { prismaCode, errMsg: errMsg.slice(0, 300) } } : {}),
      },
      { status: 500 }
    );
  }
}
