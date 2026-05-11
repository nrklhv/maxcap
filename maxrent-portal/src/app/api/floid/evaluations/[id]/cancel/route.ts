/**
 * Permite al inversionista cancelar/borrar su evaluación actual para reintentar.
 *
 * Casos de uso típicos:
 *   - El widget Floid devolvió un reporte parcial (alguna sección falló).
 *     El usuario quiere reintentar todo desde cero sin pasar por SQL.
 *   - La evaluación quedó PENDING/PROCESSING porque el usuario cerró el popup
 *     antes de tiempo y nunca llegó callback.
 *
 * Solo se puede cancelar evaluaciones propias.
 *
 * @source POST /api/floid/evaluations/:id/cancel
 * @domain creditEvaluation
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  const row = await prisma.creditEvaluation.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      staffReservationApprovedAt: true,
    },
  });

  if (!row) {
    return NextResponse.json({ error: "Evaluación no encontrada" }, { status: 404 });
  }

  if (row.userId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Defensa: si el staff ya aprobó la reserva, no permitir borrar (se conserva
  // el rastro para auditoría). En ese caso el inversionista debe contactar al equipo.
  if (row.staffReservationApprovedAt) {
    return NextResponse.json(
      {
        error:
          "El equipo ya habilitó reservas con esta evaluación; no se puede borrar. Contacta al equipo si necesitas reiniciar.",
      },
      { status: 409 }
    );
  }

  await prisma.creditEvaluation.delete({ where: { id: row.id } });
  return NextResponse.json({ ok: true });
}
