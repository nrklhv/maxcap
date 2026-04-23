/**
 * Floid async webhook: receives the final JSON payload when `callbackUrl` was sent on the outbound request.
 * Secured with `Authorization: Bearer <FLOID_WEBHOOK_SECRET>` (set the same value in Floid Admin / your env).
 *
 * @source POST /api/floid/callback
 * @domain creditEvaluation
 */

import { NextResponse } from "next/server";
import { completeFloidEvaluationFromCallbackPayload } from "@/lib/services/floid.service";

function getBearerToken(request: Request): string | null {
  const h = request.headers.get("authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim();
}

export async function POST(request: Request) {
  const secret = process.env.FLOID_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook no configurado (FLOID_WEBHOOK_SECRET)" },
      { status: 503 }
    );
  }

  const token = getBearerToken(request);
  if (!token || token !== secret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const rec = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const caseId =
    typeof rec.caseid === "string"
      ? rec.caseid
      : typeof rec.caseId === "string"
        ? rec.caseId
        : typeof rec.case_id === "string"
          ? rec.case_id
          : null;

  if (!caseId) {
    return NextResponse.json({ error: "Falta caseid en el cuerpo" }, { status: 400 });
  }

  try {
    const { evaluationId } = await completeFloidEvaluationFromCallbackPayload(caseId, body);
    return NextResponse.json({ ok: true, evaluationId });
  } catch (e) {
    console.error("[Floid callback]", e);
    const msg = e instanceof Error ? e.message : "Error";
    const status = msg.includes("No se encontró") ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
