// =============================================================================
// API: GET /api/floid/evaluations
// Listar evaluaciones del usuario (más reciente primero)
// =============================================================================

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const evaluations = await prisma.creditEvaluation.findMany({
    where: { userId: session.user.id },
    orderBy: { requestedAt: "desc" },
    select: {
      id: true,
      status: true,
      score: true,
      riskLevel: true,
      maxApprovedAmount: true,
      summary: true,
      requestedAt: true,
      completedAt: true,
      // No exponer rawResponse al frontend (puede ser muy grande)
    },
  });

  return NextResponse.json({ evaluations });
}
