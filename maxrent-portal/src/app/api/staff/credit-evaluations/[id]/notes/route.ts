/**
 * Staff: actualiza las notas internas (`staffNotes`) de una evaluación crediticia.
 * No visible al inversionista. Sirve para registrar criterio de aprobación, dudas, etc.
 *
 * @source PATCH /api/staff/credit-evaluations/:id/notes
 * @domain staff
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffSuperAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  // Limitar a 5000 caracteres para evitar payloads abusivos. Vacío = limpiar nota.
  notes: z.string().max(5000),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireStaffSuperAdmin();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "notes debe ser string (máx 5000 chars)", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const row = await prisma.creditEvaluation.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!row) {
    return NextResponse.json({ error: "Evaluación no encontrada" }, { status: 404 });
  }

  const trimmed = parsed.data.notes.trim();
  await prisma.creditEvaluation.update({
    where: { id: row.id },
    data: {
      staffNotes: trimmed.length > 0 ? trimmed : null,
    },
  });

  return NextResponse.json({ ok: true, notes: trimmed.length > 0 ? trimmed : null });
}
