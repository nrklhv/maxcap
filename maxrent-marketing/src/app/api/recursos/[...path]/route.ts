// =============================================================================
// GET /api/recursos/<slug>/<...archivo>
// =============================================================================
// Endpoint gated (auth via middleware). Sirve archivos desde private/recursos/
// con el header Content-Disposition: attachment para forzar descarga.
// =============================================================================

import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { auth } from "@/lib/auth";
import { resolveResourcePath } from "@/lib/recursos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".ai": "application/postscript",
  ".eps": "application/postscript",
};

export async function GET(
  _req: Request,
  { params }: { params: { path: string[] } }
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const [slug, ...rest] = params.path;
  if (!slug || rest.length === 0) {
    return NextResponse.json({ error: "Ruta inválida" }, { status: 400 });
  }

  const filePath = resolveResourcePath(slug, rest);
  if (!filePath) {
    return NextResponse.json({ error: "Ruta inválida" }, { status: 400 });
  }

  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    throw err;
  }

  if (!stat.isFile()) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const buffer = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const filename = path.basename(filePath);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Content-Length": String(buffer.length),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
