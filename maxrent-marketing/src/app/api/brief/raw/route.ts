// =============================================================================
// GET /api/brief/raw — descarga el markdown del brief
// =============================================================================
// Auth via middleware (allowlist). El archivo es interno; el descargable se
// archiva como .md para que el equipo pueda copiarlo a Notion / Google Doc.
// =============================================================================

import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const filePath = path.join(process.cwd(), "docs", "MARKETING_BRIEF.md");
  try {
    const md = await fs.readFile(filePath, "utf-8");
    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="MaxRent-brief-marketing.md"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Brief no encontrado" }, { status: 404 });
    }
    throw err;
  }
}
