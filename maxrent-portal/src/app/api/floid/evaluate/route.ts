/**
 * Triggers a server-side credit evaluation via {@link floidService}.
 * Requires explicit JSON consent (`consentAccepted`, `consentVersion`) per product/legal requirements.
 *
 * Sync: returns `COMPLETED` with scores. Async (when `FLOID_CALLBACK_URL` is set and Floid acknowledges):
 * may return `PROCESSING` until {@link completeFloidEvaluationFromCallbackPayload} runs.
 *
 * @source POST /api/floid/evaluate
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { floidEvaluateRequestSchema } from "@/lib/floid/evaluate-body.schema";
import { floidService } from "@/lib/services/floid.service";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = floidEvaluateRequestSchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg =
      first.consentAccepted?.[0] ||
      first.consentVersion?.[0] ||
      "Solicitud inválida";
    return NextResponse.json({ error: msg, details: parsed.error.flatten() }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile?.onboardingCompleted || !profile.rut) {
    return NextResponse.json(
      { error: "Debes completar tu perfil antes de solicitar una evaluación" },
      { status: 400 }
    );
  }

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

  const consentAt = new Date();

  try {
    const evaluation = await floidService.requestEvaluation(session.user.id, {
      consentAt,
      consentVersion: parsed.data.consentVersion,
    });
    return NextResponse.json({ evaluation });
  } catch (error) {
    console.error("[Floid Evaluate]", error);
    return NextResponse.json(
      { error: "Error al procesar la evaluación" },
      { status: 500 }
    );
  }
}
