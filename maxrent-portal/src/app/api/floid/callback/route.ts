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

/** Crop a token to the first 8 + last 4 chars for safe logging. */
function cropToken(t: string | null): string {
  if (!t) return "(none)";
  if (t.length <= 12) return "(short)";
  return `${t.slice(0, 8)}...${t.slice(-4)}`;
}

export async function POST(request: Request) {
  const secret = process.env.FLOID_WEBHOOK_SECRET?.trim();
  const receivedToken = getBearerToken(request);
  const authHeaderRaw = request.headers.get("authorization");

  // Loguear lo que llega (cropped) para diagnóstico — útil hasta confirmar con
  // Floid qué exactamente manda en el header.
  console.log(
    `[Floid callback] auth header present=${Boolean(authHeaderRaw)} bearer=${cropToken(receivedToken)} secret_configured=${Boolean(secret)}`
  );

  if (secret) {
    if (!receivedToken || receivedToken !== secret) {
      console.warn(
        `[Floid callback] Bearer mismatch. Received=${cropToken(receivedToken)} Expected=${cropToken(secret)}. Rechazando 401.`
      );
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  } else {
    // Sin secret configurado: aceptamos el POST (con warning). Recomendado
    // configurarlo cuando Floid confirme qué token envía.
    console.warn(
      "[Floid callback] FLOID_WEBHOOK_SECRET no configurado — aceptando POST sin validar."
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
