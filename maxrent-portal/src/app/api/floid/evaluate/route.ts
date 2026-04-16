// =============================================================================
// API: POST /api/floid/evaluate
// Solicitar nueva evaluación crediticia
// =============================================================================

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { floidService } from "@/lib/services/floid.service";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Verificar que tiene perfil completo
  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile?.onboardingCompleted || !profile.rut) {
    return NextResponse.json(
      { error: "Debes completar tu perfil antes de solicitar una evaluación" },
      { status: 400 }
    );
  }

  // Verificar que no tiene una evaluación en proceso
  const pendingEval = await prisma.creditEvaluation.findFirst({
    where: {
      userId: session.user.id,
      status: { in: ["PENDING", "PROCESSING"] },
    },
  });

  if (pendingEval) {
    return NextResponse.json(
      { error: "Ya tienes una evaluación en proceso", evaluation: pendingEval },
      { status: 409 }
    );
  }

  try {
    const evaluation = await floidService.requestEvaluation(session.user.id);
    return NextResponse.json({ evaluation });
  } catch (error) {
    console.error("[Floid Evaluate]", error);
    return NextResponse.json(
      { error: "Error al procesar la evaluación" },
      { status: 500 }
    );
  }
}
