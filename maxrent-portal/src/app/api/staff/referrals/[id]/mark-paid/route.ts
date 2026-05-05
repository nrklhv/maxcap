/**
 * Staff: marca un Referral como pagado al referidor.
 *
 * Solo se puede marcar pagado un Referral que esté en `status = SIGNED` (el
 * referido escrituró) y `payoutStatus = PENDING`. La nota es texto libre que
 * deja staff con detalle de la transferencia (ej. "Transferencia BCI ref
 * 12345 - 15-may-2026").
 *
 * Este endpoint NO ejecuta la transferencia bancaria — staff la procesa por
 * fuera y registra acá el resultado.
 *
 * @source POST /api/staff/referrals/:id/mark-paid
 * @body { note: string } — texto libre, requerido (mínimo 1 char).
 * @domain maxrent-portal / staff
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { requireStaffSuperAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  note: z.string().trim().min(1, "Nota requerida").max(2000),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireStaffSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  const referral = await prisma.referral.findUnique({
    where: { id: id.trim() },
    select: { id: true, status: true, payoutStatus: true },
  });
  if (!referral) {
    return NextResponse.json(
      { error: "Referral no encontrado" },
      { status: 404 }
    );
  }
  if (referral.status !== "SIGNED") {
    return NextResponse.json(
      {
        error: `Solo se puede pagar un referral en estado SIGNED (este está en ${referral.status})`,
      },
      { status: 400 }
    );
  }
  if (referral.payoutStatus === "PAID") {
    return NextResponse.json(
      { error: "Este referral ya fue marcado como pagado" },
      { status: 400 }
    );
  }

  const updated = await prisma.referral.update({
    where: { id: referral.id },
    data: {
      payoutStatus: "PAID",
      paidAt: new Date(),
      payoutNote: parsed.data.note,
    },
    select: { id: true, payoutStatus: true, paidAt: true, payoutNote: true },
  });

  return NextResponse.json({ ok: true, referral: updated });
}
