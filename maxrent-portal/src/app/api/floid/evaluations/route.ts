/**
 * Lists persisted {@link prisma.creditEvaluation} rows for the session user (newest first).
 * Does not call Floid directly; use POST /api/floid/evaluate to start a run.
 *
 * @source GET /api/floid/evaluations
 */

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
      errorMessage: true,
      staffReservationApprovedAt: true,
    },
  });

  return NextResponse.json({ evaluations });
}
