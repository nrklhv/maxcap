/**
 * Cron diario: backup offsite de la DB a Vercel Blob.
 *
 * Flujo:
 *   1. Auth `Authorization: Bearer <CRON_SECRET>`.
 *   2. `buildDatabaseDump()` arma un `.tar.gz` con JSONL por tabla.
 *   3. Sube el archivo a Vercel Blob privado con path `db-backups/YYYY-MM-DD.tar.gz`.
 *      Si ya existe el archivo del día (re-corrida manual), lo sobrescribe.
 *   4. Cleanup: borra blobs con prefijo `db-backups/` y `pathname` previo
 *      a hoy menos 30 días.
 *   5. Devuelve métricas (tamaño, filas totales, tablas, blobs borrados).
 *
 * Auth & seguridad:
 *   - Sin `CRON_SECRET` configurado → 503 (defensivo).
 *   - Sin `BLOB_READ_WRITE_TOKEN` configurado → 503 (Vercel Blob no activado).
 *   - El blob queda en modo **privado** (`access: "private"`) — Vercel Blob
 *     soporta stores privados desde 2025. Solo accesibles con el SDK + token,
 *     no via URL pública.
 *
 * Vercel Cron emite GET; aceptamos POST también para invocación manual de
 * staff (con el mismo header de auth, sin UI pública).
 *
 * @source GET|POST /api/cron/db-backup
 * @domain maxrent-portal / cron / backup
 */

import { NextRequest, NextResponse } from "next/server";
import { del, list, put } from "@vercel/blob";

import {
  buildDatabaseDump,
  backupBlobPath,
} from "@/lib/services/db-backup";

// Prisma + buffers grandes → node runtime obligatorio.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Backup puede tardar — subimos a 300s (max Vercel Pro). En Hobby el max es 60s;
// si la DB crece y supera ese límite, hay que subir a Pro o paginar por tabla.
export const maxDuration = 300;

const RETENTION_DAYS = 30;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return false;
  return match[1].trim() === secret;
}

async function handle(req: NextRequest) {
  // Loguear estado de env vars al inicio (útil cuando devolvemos 503 para
  // saber exactamente qué falta sin tener que pegar la respuesta).
  const envStatus = {
    cronSecret: Boolean(process.env.CRON_SECRET?.trim()),
    blobToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim()),
    databaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
  };
  console.log("[cron/db-backup] env status:", JSON.stringify(envStatus));

  if (!envStatus.cronSecret) {
    console.error("[cron/db-backup] CRON_SECRET ausente — 503");
    return NextResponse.json(
      { error: "CRON_SECRET no configurado" },
      { status: 503 }
    );
  }
  if (!envStatus.blobToken) {
    console.error(
      "[cron/db-backup] BLOB_READ_WRITE_TOKEN ausente — 503. Activá la integración Blob en Vercel Storage y redeployá."
    );
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN no configurado (¿Vercel Blob activado?)" },
      { status: 503 }
    );
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = new Date();
  const blobPath = backupBlobPath(now);

  try {
    // 1. Armar el dump
    const { tarGz, metadata } = await buildDatabaseDump({ now });

    // 2. Subir al store privado de Vercel Blob.
    // Sin random suffix: el path es estable (1 backup por día), facilita
    // que el restore script encuentre el archivo del día específico.
    const uploaded = await put(blobPath, tarGz, {
      access: "private",
      contentType: "application/gzip",
      allowOverwrite: true,
    });

    // 3. Cleanup de backups antiguos (> RETENTION_DAYS)
    const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const deleted = await cleanupOldBackups(cutoff);

    return NextResponse.json({
      ok: true,
      blobUrl: uploaded.url,
      blobPath,
      sizeBytes: tarGz.length,
      totalRows: metadata.totalRows,
      tables: metadata.tables,
      schemaVersion: metadata.schemaVersion,
      retention: {
        days: RETENTION_DAYS,
        deleted: deleted.length,
        deletedPaths: deleted,
      },
      ranAt: now.toISOString(),
    });
  } catch (err) {
    console.error("/api/cron/db-backup — error", err);
    return NextResponse.json(
      {
        error: "Falló el backup",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

/**
 * Lista blobs bajo `db-backups/` y borra los anteriores al `cutoff`. Usa el
 * `uploadedAt` que devuelve el listing (no el pathname con fecha, porque la
 * fecha del nombre puede no coincidir si se hace re-corrida manual).
 *
 * Pagina hasta 1000 blobs (default de Vercel Blob list). Con retención de 30
 * días + 1 backup/día, jamás vamos a tener tantos blobs.
 */
async function cleanupOldBackups(cutoff: Date): Promise<string[]> {
  const deleted: string[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({ prefix: "db-backups/", cursor });
    for (const b of page.blobs) {
      if (b.uploadedAt < cutoff) {
        await del(b.url);
        deleted.push(b.pathname);
      }
    }
    cursor = page.cursor;
  } while (cursor);

  return deleted;
}

export const GET = handle;
export const POST = handle;
