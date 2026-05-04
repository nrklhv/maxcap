// =============================================================================
// Tipos para piezas de feed (Instagram + Facebook)
// =============================================================================
// Cada pieza es declarativa: data + tipo de template. El renderer las convierte
// en PNG via next/og. Las piezas se agrupan en batches por fecha.
//
// Hay tres familias de templates:
//   - editorial   : layout principal (logo, eyebrow, headline, viz, bajada)
//   - two-columns : single con 2 columnas (Nueva vs. Club)
//   - pregunta    : single con pregunta hook + 3 razones bullet
//
// Las piezas pueden ser standalone (singles) o parte de un carrusel
// (4 slides que se suben juntas a IG/FB).
// =============================================================================

export type Formato = "1:1" | "4:5";

export const DIMENSIONES: Record<Formato, { ancho: number; alto: number }> = {
  "1:1": { ancho: 1080, alto: 1080 },
  "4:5": { ancho: 1080, alto: 1350 },
};

/** Estilos de span para spans inline dentro de headlines y bajadas. */
export type SpanStyle =
  | "italic-orange" // énfasis fuerte (palabra clave del headline)
  | "italic"
  | "orange-medium" // resaltado dentro de bajada (peso 500)
  | "orange"
  | "muted-italic"; // prefijo de bajada con menos peso

export type Span = {
  text: string;
  style?: SpanStyle;
};

/** Visualizaciones disponibles para piezas tipo editorial. */
export type VizType =
  | "dots-cover" // grid 10×10 todos llenos
  | "dots-empty" // grid 10×10 con N círculos vacíos
  | "bars-24-meses" // chart vacancia (24 barras + 24 estables)
  | "radial-lines" // gastos prorrateados
  | "timeline-pasos" // cómo funciona (4 nodos, uno activo)
  | "comparativa-tabla" // tabla nuevas vs usadas
  | "tir-bars" // bars TIR 7,9% vs 11,0%
  | "dia1-vs-mes37"; // timeline día 1 vs mes 37

export type VizConfig =
  | { type: "dots-cover" }
  | { type: "dots-empty"; emptyIndices: number[] }
  | { type: "bars-24-meses"; sinPool: number[] }
  | { type: "radial-lines" }
  | { type: "timeline-pasos"; activeStep: number }
  | { type: "comparativa-tabla"; filas: { label: string; nueva: string; club: string }[] }
  | { type: "tir-bars"; nueva: number; club: number; max: number }
  | { type: "dia1-vs-mes37" };

/** Información de carrusel — presente si la pieza es slide de un grupo. */
export type CarruselInfo = {
  /** id único del carrusel — todos los slides del mismo carrusel comparten este id */
  id: string;
  /** Nombre visible del carrusel */
  nombre: string;
  /** Posición 1-based del slide */
  slideIdx: number;
  /** Total de slides del carrusel */
  total: number;
};

interface PiezaBase {
  /** slug único dentro del batch — usado en URL */
  id: string;
  /** Título mostrado en el listado */
  titulo: string;
  formato: Formato;
  /** Fondo dominante */
  fondo: "dark" | "cream";
  /** Si la pieza es parte de un carrusel */
  carrusel?: CarruselInfo;
}

/** Pieza tipo editorial — layout principal con headline serif + bajada. */
export interface PiezaEditorial extends PiezaBase {
  tipo: "editorial";
  /** Eyebrow uppercase orange — opcional */
  eyebrow?: string;
  /** Headline como array de líneas con spans inline */
  headline?: Span[][];
  /** Tamaño de fuente headline (default 108) */
  headlineSize?: number;
  /** Bajada como array de spans inline */
  bajada?: Span[];
  /** Visualización opcional entre headline y bajada */
  viz?: VizConfig;
  /** Footer pequeño italic muted (ej. disclaimer) */
  footer?: string;
}

/** Pieza tipo two-columns — comparación lado a lado. */
export interface PiezaTwoColumns extends PiezaBase {
  tipo: "two-columns";
  /** Eyebrow uppercase orange */
  eyebrow: string;
  /** Filas de comparación */
  filas: Array<{
    valNueva: string;
    lblNueva: string;
    valClub: string;
    lblClub: string;
    /** Tamaño de fuente del valor (default 50) */
    valSize?: number;
  }>;
  /** Footer disclaimer */
  footer?: string;
}

/** Pieza tipo pregunta — hook con pregunta + 3 razones bullet. */
export interface PiezaPregunta extends PiezaBase {
  tipo: "pregunta";
  /** Eyebrow uppercase orange */
  eyebrow: string;
  /** Pregunta serif gigante */
  headline: Span[][];
  /** Respuestas bullet con flecha — cada respuesta es un array de spans */
  respuestas: Span[][];
  /** Footer disclaimer */
  footer?: string;
}

export type Pieza = PiezaEditorial | PiezaTwoColumns | PiezaPregunta;

export type Batch = {
  /** ISO date YYYY-MM-DD */
  fecha: string;
  nombre: string;
  descripcion: string;
  piezas: Pieza[];
};
