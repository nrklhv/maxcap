/**
 * Staff: detalle de un pool + sus unidades **con `internalData`** (dirección
 * exacta, depto, fila raw del Excel). NO usar esta forma en el portal de
 * inversionista — esa info es interna.
 *
 * PATCH permite editar `description`, `status` (DRAFT/OPEN/CLOSED) y
 * `acceptingReservations` (toggle de pausa rápida).
 *
 * @source GET   /api/staff/pools/[slug]
 * @source PATCH /api/staff/pools/[slug]
 * @domain maxrent-portal / staff
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffSuperAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getStaffPoolDetail } from "@/lib/services/pool.service";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const session = await requireStaffSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const detail = await getStaffPoolDetail(params.slug);
  if (!detail) {
    return NextResponse.json({ error: "Pool no encontrado" }, { status: 404 });
  }

  const { pool, units } = detail;
  return NextResponse.json({
    pool: {
      id: pool.id,
      slug: pool.slug,
      name: pool.name,
      description: pool.description,
      status: pool.status,
      acceptingReservations: pool.acceptingReservations,
      capRateBruto: pool.capRateBruto.toString(),
      reservationFeeClp: pool.reservationFeeClp.toString(),
      totalUnits: pool.totalUnits,
      totalValueUf: pool.totalValueUf ? pool.totalValueUf.toString() : null,
      totalMonthlyRentClp: pool.totalMonthlyRentClp
        ? pool.totalMonthlyRentClp.toString()
        : null,
      occupancyPct: pool.occupancyPct,
    },
    units: units.map((u) => ({
      id: u.id,
      externalId: u.externalId,
      label: u.label,
      priceUf: u.priceUf.toString(),
      priceClp: u.priceClp.toString(),
      monthlyRentClp: u.monthlyRentClp.toString(),
      ocupacion: u.ocupacion,
      comuna: u.comuna,
      dormitorios: u.dormitorios,
      banos: u.banos,
      superficieUtilM2: u.superficieUtilM2,
      superficieTerrazaM2: u.superficieTerrazaM2,
      saleStatus: u.saleStatus,
      // Staff ve todo: dirección, depto, raw del Excel.
      internalData: u.internalData,
      // Reserva activa actual (si existe).
      activeReservation: u.reservations[0]
        ? {
            id: u.reservations[0].id,
            status: u.reservations[0].status,
            amount: u.reservations[0].amount.toString(),
            createdAt: u.reservations[0].createdAt.toISOString(),
            expiresAt: u.reservations[0].expiresAt
              ? u.reservations[0].expiresAt.toISOString()
              : null,
            paidAt: u.reservations[0].paidAt
              ? u.reservations[0].paidAt.toISOString()
              : null,
            user: u.reservations[0].user,
          }
        : null,
    })),
  });
}

const patchSchema = z
  .object({
    description: z.string().max(2000).nullable().optional(),
    status: z.enum(["DRAFT", "OPEN", "CLOSED"]).optional(),
    acceptingReservations: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.description !== undefined ||
      v.status !== undefined ||
      v.acceptingReservations !== undefined,
    { message: "Indica al menos un campo a actualizar" }
  );

export async function PATCH(req: Request, { params }: { params: { slug: string } }) {
  const session = await requireStaffSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", errors: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.pool.update({
      where: { slug: params.slug },
      data: parsed.data,
      select: {
        slug: true,
        status: true,
        acceptingReservations: true,
        description: true,
      },
    });
    return NextResponse.json({ ok: true, pool: updated });
  } catch (e) {
    const isNotFound =
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code?: string }).code === "P2025";
    if (isNotFound) {
      return NextResponse.json({ error: "Pool no encontrado" }, { status: 404 });
    }
    console.error("[PATCH /api/staff/pools/[slug]]", e);
    return NextResponse.json({ error: "No se pudo actualizar el pool" }, { status: 500 });
  }
}
