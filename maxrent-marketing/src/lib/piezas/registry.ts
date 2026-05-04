// =============================================================================
// Registry de batches — sumar acá cada batch nuevo
// =============================================================================

import type { Batch, Pieza } from "./types";
import { batch as batch_2026_05_04 } from "./batches/2026-05-04";

export const BATCHES: Batch[] = [
  batch_2026_05_04,
  // Sumar acá los batches futuros (orden cronológico inverso opcional)
];

export function findBatch(fecha: string): Batch | null {
  return BATCHES.find((b) => b.fecha === fecha) ?? null;
}

export function findPieza(fecha: string, id: string): Pieza | null {
  const b = findBatch(fecha);
  if (!b) return null;
  return b.piezas.find((p) => p.id === id) ?? null;
}
