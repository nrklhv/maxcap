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
import { EditorialSingle } from "@/lib/piezas/templates/EditorialSingle";
import { TwoColumnsSingle } from "@/lib/piezas/templates/TwoColumnsSingle";
import { PreguntaSingle } from "@/lib/piezas/templates/PreguntaSingle";

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
    case "editorial":
      element = <EditorialSingle pieza={pieza} ancho={ancho} alto={alto} />;
      break;
    case "two-columns":
      element = <TwoColumnsSingle pieza={pieza} ancho={ancho} alto={alto} />;
      break;
    case "pregunta":
      element = <PreguntaSingle pieza={pieza} ancho={ancho} alto={alto} />;
      break;
    default: {
      const _exhaustive: never = pieza;
      return NextResponse.json(
        { error: `Tipo de pieza no soportado: ${(_exhaustive as { tipo: string }).tipo}` },
        { status: 500 }
      );
    }
  }

  const png = new ImageResponse(element, {
    width: ancho,
    height: alto,
    fonts,
  });

  const url = new URL(request.url);
  if (url.searchParams.get("download")) {
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
