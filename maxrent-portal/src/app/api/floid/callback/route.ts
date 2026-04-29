/**
 * Webhook que recibe el reporte agregado del Floid Widget (SP + SII + CMF).
 *
 * Configuración del widget en `admin.floid.app`:
 *   Webhook URL: https://<dominio>/api/floid/callback
 *   (Authorization: Bearer ${FLOID_WEBHOOK_SECRET} si Floid lo permite configurar)
 *
 * Si `FLOID_WEBHOOK_SECRET` está set, validamos el header `Authorization: Bearer <secret>`.
 * Si no está set, aceptamos sin validar y logueamos un warning (modo desarrollo —
 * no recomendado para producción; un atacante podría enviar payloads falsos).
 *
 * @source POST /api/floid/callback
 * @domain creditEvaluation
 */

import { NextResponse } from "next/server";
import { completeFloidEvaluationFromWidget } from "@/lib/services/floid.service";

function getBearerToken(request: Request): string | null {
  const h = request.headers.get("authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim();
}

export async function POST(request: Request) {
  const secret = process.env.FLOID_WEBHOOK_SECRET?.trim();

  if (secret) {
    const token = getBearerToken(request);
    if (!token || token !== secret) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    // En prod NO permitimos el modo abierto: hay que setear el secret.
    console.error(
      "[Floid callback] FLOID_WEBHOOK_SECRET no configurado en producción. Rechazando POST."
    );
    return NextResponse.json(
      { error: "Webhook no configurado correctamente" },
      { status: 503 }
    );
  } else {
    console.warn(
      "[Floid callback] FLOID_WEBHOOK_SECRET no configurado — aceptando POST sin validar (solo dev)."
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  try {
    const { evaluationId } = await completeFloidEvaluationFromWidget(body);
    return NextResponse.json({ ok: true, evaluationId });
  } catch (e) {
    console.error("[Floid callback]", e);
    const msg = e instanceof Error ? e.message : "Error";
    const status = /no se encontr|no contiene|no trae/i.test(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
