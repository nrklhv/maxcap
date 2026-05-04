// =============================================================================
// scripts/render-piezas.tsx — render local de piezas a PNG (dev only)
// =============================================================================
// Uso:
//   npx tsx scripts/render-piezas.tsx [fecha-batch] [filtro-id]
//
// Ejemplos:
//   npx tsx scripts/render-piezas.tsx                        # rendera todos los batches
//   npx tsx scripts/render-piezas.tsx 2026-05-04             # un batch
//   npx tsx scripts/render-piezas.tsx 2026-05-04 pilar-01    # una pieza específica
//
// Output: dev-output/<fecha>/<id>.png (gitignored). Permite iterar templates
// sin tener que pasar por dev server, login ni deploy.
// =============================================================================

import { ImageResponse } from "next/og";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as React from "react";

import { BATCHES } from "../src/lib/piezas/registry";
import { DIMENSIONES, type Pieza } from "../src/lib/piezas/types";
import { imageResponseFonts } from "../src/lib/piezas/fonts";
import { EditorialSingle } from "../src/lib/piezas/templates/EditorialSingle";
import { TwoColumnsSingle } from "../src/lib/piezas/templates/TwoColumnsSingle";
import { PreguntaSingle } from "../src/lib/piezas/templates/PreguntaSingle";

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "dev-output");

function elementoPara(pieza: Pieza, ancho: number, alto: number): React.ReactElement {
  switch (pieza.tipo) {
    case "editorial":
      return <EditorialSingle pieza={pieza} ancho={ancho} alto={alto} />;
    case "two-columns":
      return <TwoColumnsSingle pieza={pieza} ancho={ancho} alto={alto} />;
    case "pregunta":
      return <PreguntaSingle pieza={pieza} ancho={ancho} alto={alto} />;
    default: {
      const _exhaustive: never = pieza;
      throw new Error(`Tipo no soportado`);
    }
  }
}

async function main() {
  const [, , filtroBatch, filtroId] = process.argv;

  const fonts = await imageResponseFonts();
  let total = 0;

  for (const batch of BATCHES) {
    if (filtroBatch && batch.fecha !== filtroBatch) continue;

    const dir = path.join(OUT, batch.fecha);
    await fs.mkdir(dir, { recursive: true });

    for (const pieza of batch.piezas) {
      if (filtroId && pieza.id !== filtroId) continue;

      const { ancho, alto } = DIMENSIONES[pieza.formato];
      const element = elementoPara(pieza, ancho, alto);

      const response = new ImageResponse(element, {
        width: ancho,
        height: alto,
        fonts,
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      const out = path.join(dir, `${pieza.id}.png`);
      await fs.writeFile(out, buffer);
      console.log(`✓ ${path.relative(ROOT, out)}  (${ancho}×${alto})`);
      total++;
    }
  }

  console.log(`\n${total} pieza(s) rendereada(s) en dev-output/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
