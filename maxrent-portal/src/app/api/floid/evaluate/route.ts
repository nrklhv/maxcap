/**
 * Inicia una evaluación crediticia: crea una `CreditEvaluation` en PENDING
 * y devuelve la URL del widget Floid para que el frontend la abra.
 *
 * Flujo:
 *   1. El frontend hace POST acá con el consentimiento dual (preview + consent).
 *   2. Devolvemos `{ evaluationId, widgetUrl, status }`.
 *   3. El frontend abre `widgetUrl` en popup; el usuario completa el flujo en Floid.
 *   4. Floid POSTea el reporte a `/api/floid/callback` y la fila pasa a COMPLETED.
 *
 * Si el widget está deshabilitado (modo stub), `widgetUrl` viene en null y la
 * fila ya queda en COMPLETED con un payload simulado — el frontend solo refresca.
 *
 * @source POST /api/floid/evaluate
 * @domain creditEvaluation
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { floidEvaluateRequestSchema } from "@/lib/floid/evaluate-body.schema";
import { createWidgetEvaluation } from "@/lib/services/floid.service";

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
    return NextResponse.json(
      { error: msg, details: parsed.error.flatten() },
      { status: 400 }
    );
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

  // Evita iniciar dos sesiones de widget en paralelo: si hay una pendiente,
  // devolvemos la misma para que el frontend reutilice la URL del widget.
  const existing = await prisma.creditEvaluation.findFirst({
    where: {
      userId: session.user.id,
      status: { in: ["PENDING", "PROCESSING"] },
    },
  });
  if (existing) {
    return NextResponse.json(
      {
        error: "Ya tienes una evaluación en curso",
        evaluation: { id: existing.id, status: existing.status },
      },
      { status: 409 }
    );
  }

  try {
    const result = await createWidgetEvaluation(session.user.id, {
      consentAt: new Date(),
      consentVersion: parsed.data.consentVersion,
    });
    return NextResponse.json({
      evaluationId: result.evaluationId,
      widgetUrl: result.widgetUrl,
      status: result.status,
    });
  } catch (error) {
    console.error("[Floid Evaluate]", error);
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
