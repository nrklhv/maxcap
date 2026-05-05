/**
 * Staff: marca una comisión de BrokerLead como pagada al broker.
 *
 * Solo se puede pagar un BrokerLead en `status = CONTRACT_SIGNED` (el
 * prospect escrituró) y `payoutStatus = PENDING`. La comisión es VARIABLE —
 * el monto, fecha y forma de pago se registran como texto libre en
 * `payoutNote` (ej. `"Boleta hon. 2026-0123 - $850.000 - BCI 18-jun-2026"`).
 *
 * @source POST /api/staff/broker-leads/:id/mark-paid
 * @body { note: string } — texto libre, requerido. DEBE incluir monto y
 *       referencia de la transferencia (la comisión no está en schema).
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

  const brokerLead = await prisma.brokerLead.findUnique({
    where: { id: id.trim() },
    select: { id: true, status: true, payoutStatus: true },
  });
  if (!brokerLead) {
    return NextResponse.json(
      { error: "BrokerLead no encontrado" },
      { status: 404 }
    );
  }
  if (brokerLead.status !== "CONTRACT_SIGNED") {
    return NextResponse.json(
      {
        error: `Solo se puede pagar un brokerLead en estado CONTRACT_SIGNED (este está en ${brokerLead.status})`,
      },
      { status: 400 }
    );
  }
  if (brokerLead.payoutStatus === "PAID") {
    return NextResponse.json(
      { error: "Este brokerLead ya fue marcado como pagado" },
      { status: 400 }
    );
  }

  const updated = await prisma.brokerLead.update({
    where: { id: brokerLead.id },
    data: {
      payoutStatus: "PAID",
      paidAt: new Date(),
      payoutNote: parsed.data.note,
    },
    select: { id: true, payoutStatus: true, paidAt: true, payoutNote: true },
  });

  return NextResponse.json({ ok: true, brokerLead: updated });
}
