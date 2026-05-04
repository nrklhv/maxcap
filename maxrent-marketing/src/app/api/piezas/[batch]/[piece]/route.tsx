// =============================================================================
// GET /api/piezas/<fecha>/<id>[.png]?download=1
// =============================================================================
// Renderiza una pieza como PNG via next/og (Satori). Sin ?download lo sirve
// inline (para previsualización en el listado). Con ?download fuerza descarga.
// =============================================================================

import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { findPieza } from "@/lib/piezas/registry";
import { DIMENSIONES } from "@/lib/piezas/types";
import { imageResponseFonts } from "@/lib/piezas/fonts";
import { PilarSingle } from "@/lib/piezas/templates/PilarSingle";

// Edge runtime: ImageResponse va más rápido y soporta el fetch de fuentes desde CDN.
// Auth: el middleware ya valida sesión antes de llegar acá (devuelve 401 si no).
export const runtime = "edge";

function stripExt(s: string): string {
  return s.replace(/\.png$/i, "");
}

export async function GET(
  request: Request,
  { params }: { params: { batch: string; piece: string } }
) {
  const id = stripExt(params.piece);
  const pieza = findPieza(params.batch, id);
  if (!pieza) {
    return NextResponse.json({ error: "Pieza no encontrada" }, { status: 404 });
  }

  const { ancho, alto } = DIMENSIONES[pieza.formato];
  const fonts = await imageResponseFonts();

  let element: React.ReactElement;
  switch (pieza.tipo) {
    case "pilar":
      element = <PilarSingle pieza={pieza} ancho={ancho} alto={alto} />;
      break;
    default:
      return NextResponse.json(
        { error: `Tipo de pieza no soportado: ${(pieza as { tipo: string }).tipo}` },
        { status: 500 }
      );
  }

  const png = new ImageResponse(element, {
    width: ancho,
    height: alto,
    fonts,
  });

  const url = new URL(request.url);
  if (url.searchParams.get("download")) {
    // Re-empaquetar para sumar Content-Disposition: attachment.
    const buf = await png.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${params.batch}-${id}.png"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  }

  return png;
}
