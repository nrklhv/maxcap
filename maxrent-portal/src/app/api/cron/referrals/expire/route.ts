/**
 * Cron diario: expirar atribuciones vencidas.
 *
 * Recorre `Referral` y `BrokerLead` con `expiresAt < now` y status no
 * terminal, y los marca como EXPIRED / LOST. Llamado por Vercel Cron 1x
 * al día (ver `vercel.json`). También puede invocarse manualmente con el
 * mismo header de auth.
 *
 * Auth: header `Authorization: Bearer <CRON_SECRET>`. Sin la env var seteada,
 * el endpoint rechaza con 503 (intencional — no queremos que corra desprotegido).
 *
 * Vercel Cron incluye automáticamente el header con el `CRON_SECRET` configurado.
 *
 * @source GET|POST /api/cron/referrals/expire
 * @domain maxrent-portal / cron
 */

import { NextRequest, NextResponse } from "next/server";

import { expireOverdueAttributions } from "@/lib/services/referral.service";

// Edge no soporta Prisma; node runtime obligatorio.
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
    const result = await expireOverdueAttributions();
    return NextResponse.json({
      ok: true,
      ...result,
      ranAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("/api/cron/referrals/expire — error", err);
    return NextResponse.json(
      { error: "Falló la corrida de expiración" },
      { status: 500 }
    );
  }
}

// Vercel Cron emite GET por default; dejamos POST por si se invoca manualmente.
export const GET = handle;
export const POST = handle;
