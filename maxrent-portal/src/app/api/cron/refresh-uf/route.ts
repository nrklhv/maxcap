/**
 * Cron diario: trae la UF desde mindicador.cl y la persiste en `UfRate`.
 *
 * Auth: header `Authorization: Bearer <CRON_SECRET>` (mismo patrón que los
 * otros crons del proyecto — `referrals/expire`, `db-backup`). Vercel Cron
 * incluye automáticamente el header con el secret configurado.
 *
 * Sin `CRON_SECRET` configurada → 503 (defensivo, no queremos que corra
 * desprotegido).
 *
 * Idempotente: re-correr el cron el mismo día actualiza el valor de la UF
 * (por si mindicador corrige) sin crear duplicados, gracias al unique
 * constraint sobre `date`.
 *
 * Detalle: docs/UF_RATE.md.
 *
 * @source GET|POST /api/cron/refresh-uf
 * @domain uf / cron
 */

import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { fetchUfFromMindicador, upsertUfRate } from "@/lib/services/uf.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return false;
  return match[1].trim() === secret;
}

async function handle(req: NextRequest) {
  // Bucket "webhook" (60/min por IP). Vercel Cron viene de IPs estables, este
  // límite es ampliamente suficiente. Cubre además el caso de invocación
  // manual abusiva (poco probable, pero defensa en profundidad).
  const limited = await applyRateLimit(req, RATE_LIMITS.webhook, {
    route: "refresh-uf",
  });
  if (limited) return limited;

  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json(
      { error: "CRON_SECRET no configurado en el server" },
      { status: 503 }
    );
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const fetched = await fetchUfFromMindicador();
    const saved = await upsertUfRate(fetched);
    return NextResponse.json({
      ok: true,
      date: saved.date.toISOString().slice(0, 10),
      valueClp: saved.valueClp,
      source: saved.source,
      ranAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("/api/cron/refresh-uf — error", err);
    return NextResponse.json(
      {
        error: "Falló la actualización de UF",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

// Vercel Cron emite GET por default; permitimos POST para invocación manual.
export const GET = handle;
export const POST = handle;
