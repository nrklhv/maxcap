// =============================================================================
// Tipos para piezas de feed (Instagram + Facebook)
// =============================================================================
// Cada pieza es declarativa: data + tipo de template. El renderer las convierte
// en PNG via next/og. Las piezas se agrupan en batches por fecha.
// =============================================================================

export type Formato = "1:1" | "4:5";

export const DIMENSIONES: Record<Formato, { ancho: number; alto: number }> = {
  "1:1": { ancho: 1080, alto: 1080 },
  "4:5": { ancho: 1080, alto: 1350 },
};

interface PiezaBase {
  /** slug, único dentro del batch — usado en URL */
  id: string;
  /** Título mostrado en el listado */
  titulo: string;
  formato: Formato;
}

export interface PiezaPilar extends PiezaBase {
  tipo: "pilar";
  numero: string; // "01", "02"
  /** Stat hero — texto grande central, ej. "+5%" */
  stat: string;
  /** Etiqueta debajo del stat — ej. "cap rate real" */
  statLabel: string;
  /** Headline serif — ej. "Compramos en bloque, conseguimos mejor precio" */
  headline: string;
  /** Bajada explicativa */
  bajada: string;
}

// Discriminated union — sumamos más tipos en fases siguientes (hero, carrusel, etc.)
export type Pieza = PiezaPilar;

export type Batch = {
  /** ISO date YYYY-MM-DD */
  fecha: string;
  nombre: string;
  descripcion: string;
  piezas: Pieza[];
};
