// =============================================================================
// Batch 2026-05-04 — Lanzamiento orgánico mes 1 (7 piezas, 16 slides)
// =============================================================================
// Diseño aprobado iterando en HTML mock (dev-output/approved.html).
//
//   Singles (4):     hero, sin pie sin comisión, two-columns, pregunta
//   Carruseles (3):  pool (4 slides), cómo funciona (4), nuevas vs usadas (4)
// =============================================================================

import type { Batch } from "../types";

const DISCLAIMER = "Valores estimados sobre propiedades de ~UF 2.500. Reales pueden variar.";

export const batch: Batch = {
  fecha: "2026-05-04",
  nombre: "Lanzamiento orgánico — Mes 1",
  descripcion:
    "Primera tanda de piezas para feed de Instagram y Facebook. 4 singles + 3 carruseles (12 slides) en estilo editorial.",
  piezas: [
    // ─────────────────────────────────────────────────────────────────────────
    // SINGLE 01 · Hero "Juntos compramos mejor"
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "hero-juntos-compramos-mejor",
      titulo: "Hero · Juntos compramos mejor",
      formato: "1:1",
      tipo: "editorial",
      fondo: "dark",
      headlineSize: 144,
      headline: [
        [{ text: "Juntos" }],
        [{ text: "compramos" }],
        [{ text: "mejor.", style: "italic-orange" }],
      ],
      bajada: [
        { text: "Solos, somos un cliente más. ", style: "muted-italic" },
        { text: "Juntos somos " },
        { text: "100 inversionistas calificados", style: "orange" },
        { text: " con poder de negociación para acceder a propiedades usadas con cap rate sobre " },
        { text: "5%", style: "orange" },
        { text: " y comisiones cero." },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // SINGLE 02 · Sin pie. Sin comisión.
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "sin-pie-sin-comision",
      titulo: "Sin pie. Sin comisión.",
      formato: "1:1",
      tipo: "editorial",
      fondo: "cream",
      headlineSize: 156,
      headline: [
        [{ text: "Sin pie.", style: "italic-orange" }],
        [{ text: "Sin comisión.", style: "italic-orange" }],
      ],
      bajada: [
        { text: "Único en propiedades usadas. ", style: "muted-italic" },
        { text: "0% comisión", style: "orange-medium" },
        { text: " de compra y el pie en " },
        { text: "cuotas mensuales", style: "orange-medium" },
        { text: " después de la escritura. El arriendo desde el " },
        { text: "día uno", style: "orange-medium" },
        { text: " ayuda a cubrir ese pago." },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // CARRUSEL 03 · El pool diversificado (4 slides)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "pool-01-cover",
      titulo: "Pool · Cover",
      formato: "1:1",
      tipo: "editorial",
      fondo: "dark",
      carrusel: { id: "pool", nombre: "El pool diversificado", slideIdx: 1, total: 4 },
      eyebrow: "El pool · 1 / 4",
      headlineSize: 92,
      headline: [
        [{ text: "Tu propiedad," }],
        [{ text: "con la " }, { text: "estabilidad", style: "italic-orange" }],
        [{ text: "de un fondo." }],
      ],
      viz: { type: "dots-cover" },
      bajada: [
        { text: "Pool de 100 propiedades. ", style: "muted-italic" },
        { text: "Vacancia, morosidad y gastos diversificados." },
      ],
    },
    {
      id: "pool-02-vacancia",
      titulo: "Pool · Vacancia",
      formato: "1:1",
      tipo: "editorial",
      fondo: "cream",
      carrusel: { id: "pool", nombre: "El pool diversificado", slideIdx: 2, total: 4 },
      eyebrow: "Pool · 2 / 4",
      headline: [
        [{ text: "Vacancia" }],
        [{ text: "diversificada.", style: "italic-orange" }],
      ],
      viz: {
        type: "bars-24-meses",
        sinPool: [40, 36, 32, 38, 0, 30, 38, 34, 30, 36, 28, 32, 36, 38, 0, 34, 38, 32, 30, 38, 32, 0, 36, 34],
      },
      bajada: [
        { text: "Solo, una vacancia te deja un mes " },
        { text: "sin renta", style: "orange" },
        { text: ". En el pool, el costo se reparte entre las 100 propiedades del Club. " },
        { text: "Recibes flujo cada mes.", style: "orange" },
      ],
    },
    {
      id: "pool-03-morosidad",
      titulo: "Pool · Morosidad",
      formato: "1:1",
      tipo: "editorial",
      fondo: "dark",
      carrusel: { id: "pool", nombre: "El pool diversificado", slideIdx: 3, total: 4 },
      eyebrow: "Pool · 3 / 4",
      headline: [
        [{ text: "Morosidad" }],
        [{ text: "absorbida.", style: "italic-orange" }],
      ],
      viz: { type: "dots-empty", emptyIndices: [12, 23, 38, 47, 56, 71, 84, 92] },
      bajada: [
        { text: "Si algunos arrendatarios " },
        { text: "se atrasan", style: "orange" },
        { text: ", el impacto se diluye en el pool mientras Houm gestiona la cobranza. Tú no esperas." },
      ],
    },
    {
      id: "pool-04-gastos",
      titulo: "Pool · Gastos",
      formato: "1:1",
      tipo: "editorial",
      fondo: "cream",
      carrusel: { id: "pool", nombre: "El pool diversificado", slideIdx: 4, total: 4 },
      eyebrow: "Pool · 4 / 4",
      headline: [
        [{ text: "Gastos" }],
        [{ text: "prorrateados.", style: "italic-orange" }],
      ],
      viz: { type: "radial-lines" },
      bajada: [
        { text: "Mantenciones, rotaciones y contingencias se " },
        { text: "reparten", style: "orange" },
        { text: " entre las 100 propiedades del Club." },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // CARRUSEL 04 · Cómo funciona (4 slides)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "como-funciona-01-conocemos",
      titulo: "Cómo funciona · Te conocemos",
      formato: "1:1",
      tipo: "editorial",
      fondo: "dark",
      carrusel: { id: "como-funciona", nombre: "De inscribirte a recibir tu primera renta", slideIdx: 1, total: 4 },
      eyebrow: "Cómo funciona · 1 / 4",
      headline: [
        [{ text: "Te conocemos" }],
        [{ text: "en " }, { text: "5 minutos.", style: "italic-orange" }],
      ],
      viz: { type: "timeline-pasos", activeStep: 0 },
      bajada: [
        { text: "Llenas tus datos en el portal y " },
        { text: "te evaluamos", style: "orange" },
        { text: " con un proceso 100% digital. En menos de " },
        { text: "5 minutos", style: "orange" },
        { text: " sabes si calificas para entrar al Club." },
      ],
    },
    {
      id: "como-funciona-02-reservas",
      titulo: "Cómo funciona · Reservas",
      formato: "1:1",
      tipo: "editorial",
      fondo: "cream",
      carrusel: { id: "como-funciona", nombre: "De inscribirte a recibir tu primera renta", slideIdx: 2, total: 4 },
      eyebrow: "Cómo funciona · 2 / 4",
      headline: [
        [{ text: "Reservas" }],
        [{ text: "con " }, { text: "1 UF.", style: "italic-orange" }],
      ],
      viz: { type: "timeline-pasos", activeStep: 1 },
      bajada: [
        { text: "Pagas " },
        { text: "1 UF", style: "orange" },
        { text: " para reservar tu cupo entre los " },
        { text: "100 inversionistas", style: "orange" },
        { text: " del Club. " },
        { text: "Te la devolvemos", style: "orange" },
        { text: " si no obtienes el crédito o no se cierra el deal." },
      ],
    },
    {
      id: "como-funciona-03-firmamos",
      titulo: "Cómo funciona · Firmamos",
      formato: "1:1",
      tipo: "editorial",
      fondo: "dark",
      carrusel: { id: "como-funciona", nombre: "De inscribirte a recibir tu primera renta", slideIdx: 3, total: 4 },
      eyebrow: "Cómo funciona · 3 / 4",
      headline: [
        [{ text: "Firmamos" }],
        [{ text: "la compra.", style: "italic-orange" }],
      ],
      viz: { type: "timeline-pasos", activeStep: 2 },
      bajada: [
        { text: "Un especialista", style: "orange" },
        { text: " te asesora con el banco que mejor calce con tu perfil. Cuando se completan los 100 cupos, " },
        { text: "firmas la escritura", style: "orange" },
        { text: " de tu propiedad." },
      ],
    },
    {
      id: "como-funciona-04-trabaja",
      titulo: "Cómo funciona · Tu inversión trabaja",
      formato: "1:1",
      tipo: "editorial",
      fondo: "cream",
      carrusel: { id: "como-funciona", nombre: "De inscribirte a recibir tu primera renta", slideIdx: 4, total: 4 },
      eyebrow: "Cómo funciona · 4 / 4",
      headline: [
        [{ text: "Tu inversión" }],
        [{ text: "trabaja.", style: "italic-orange" }],
      ],
      viz: { type: "timeline-pasos", activeStep: 3 },
      bajada: [
        { text: "Houm administra", style: "orange" },
        { text: " tu propiedad dentro del pool: arriendo, cobranza y mantenciones. Recibes tu " },
        { text: "flujo mensual estable", style: "orange" },
        { text: " desde el día uno." },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // CARRUSEL 05 · Nuevas vs. usadas (4 slides)
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "nuevas-vs-usadas-01-cover",
      titulo: "Nuevas vs. usadas · Cover",
      formato: "1:1",
      tipo: "editorial",
      fondo: "dark",
      carrusel: { id: "nuevas-vs-usadas", nombre: "El mismo precio. No la misma rentabilidad.", slideIdx: 1, total: 4 },
      eyebrow: "Nuevas vs. usadas · 1 / 4",
      headlineSize: 100,
      headline: [
        [{ text: "El mismo" }],
        [{ text: "precio. No la" }],
        [{ text: "misma renta.", style: "italic-orange" }],
      ],
      bajada: [
        { text: "Pagas lo mismo por una propiedad nueva o una usada en buen sector. Pero el " },
        { text: "cap rate", style: "orange" },
        { text: " y la " },
        { text: "primera renta", style: "orange" },
        { text: " no se parecen en nada." },
      ],
      footer: DISCLAIMER,
    },
    {
      id: "nuevas-vs-usadas-02-tabla",
      titulo: "Nuevas vs. usadas · Tabla",
      formato: "1:1",
      tipo: "editorial",
      fondo: "cream",
      carrusel: { id: "nuevas-vs-usadas", nombre: "El mismo precio. No la misma rentabilidad.", slideIdx: 2, total: 4 },
      eyebrow: "Nuevas vs. usadas · 2 / 4",
      headlineSize: 100,
      headline: [
        [{ text: "La diferencia" }],
        [{ text: "en " }, { text: "números.", style: "italic-orange" }],
      ],
      viz: {
        type: "comparativa-tabla",
        filas: [
          { label: "CAP RATE", nueva: "3,3%", club: "+5%" },
          { label: "RENTA MENSUAL", nueva: "7,50 UF", club: "10,21 UF" },
          { label: "PRIMERA RENTA", nueva: "Mes 37", club: "Día 1" },
          { label: "RIESGO ARR.", nueva: "Concentrado", club: "Diluido" },
        ],
      },
      footer: DISCLAIMER,
    },
    {
      id: "nuevas-vs-usadas-03-tir",
      titulo: "Nuevas vs. usadas · TIR",
      formato: "1:1",
      tipo: "editorial",
      fondo: "dark",
      carrusel: { id: "nuevas-vs-usadas", nombre: "El mismo precio. No la misma rentabilidad.", slideIdx: 3, total: 4 },
      eyebrow: "Nuevas vs. usadas · 3 / 4",
      headline: [
        [{ text: "TIR " }, { text: "+3,1 pts.", style: "italic-orange" }],
      ],
      viz: { type: "tir-bars", nueva: 7.9, club: 11.0, max: 14 },
      bajada: [
        { text: "A 10 años, una propiedad usada en el Club rinde " },
        { text: "3,1 puntos porcentuales más", style: "orange" },
        { text: " que una propiedad nueva." },
      ],
      footer: DISCLAIMER,
    },
    {
      id: "nuevas-vs-usadas-04-dia1",
      titulo: "Nuevas vs. usadas · Día 1 vs Mes 37",
      formato: "1:1",
      tipo: "editorial",
      fondo: "cream",
      carrusel: { id: "nuevas-vs-usadas", nombre: "El mismo precio. No la misma rentabilidad.", slideIdx: 4, total: 4 },
      eyebrow: "Nuevas vs. usadas · 4 / 4",
      headline: [
        [{ text: "Día " }, { text: "uno,", style: "italic-orange" }],
        [{ text: "no mes 37." }],
      ],
      viz: { type: "dia1-vs-mes37" },
      bajada: [
        { text: "Las propiedades del Club " },
        { text: "ya están arrendadas", style: "orange" },
        { text: ". La nueva la entregan recién a los " },
        { text: "3 años", style: "orange" },
        { text: "." },
      ],
      footer: DISCLAIMER,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // SINGLE 06 · Two columns Nueva | Club
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "two-columns-nueva-club",
      titulo: "Two-columns · Nueva vs. Club",
      formato: "1:1",
      tipo: "two-columns",
      fondo: "cream",
      eyebrow: "NUEVA vs. CLUB",
      filas: [
        { valNueva: "3,3%", lblNueva: "cap rate", valClub: "+5%", lblClub: "cap rate", valSize: 50 },
        { valNueva: "Mes 37", lblNueva: "primera renta", valClub: "Día 1", lblClub: "primera renta", valSize: 50 },
        { valNueva: "7,9%", lblNueva: "TIR a 10 años", valClub: "11,0%", lblClub: "TIR a 10 años", valSize: 50 },
        { valNueva: "Tú asumes", lblNueva: "vacancia y morosidad", valClub: "Pool absorbe", lblClub: "vacancia y morosidad", valSize: 36 },
      ],
      footer: DISCLAIMER,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // SINGLE 07 · Pregunta-respuesta
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "pregunta-comprar-nueva-o-usada",
      titulo: "Pregunta · ¿Comprar nueva o usada?",
      formato: "1:1",
      tipo: "pregunta",
      fondo: "dark",
      eyebrow: "PREGUNTA",
      headline: [
        [{ text: "¿Comprar nueva o " }, { text: "usada?", style: "italic-orange" }],
      ],
      respuestas: [
        [
          { text: "Cap rate más alto", style: "orange" },
          { text: " en propiedades usadas en buen sector." },
        ],
        [
          { text: "Renta " },
          { text: "desde el día uno", style: "orange" },
          { text: ", sin esperar 3 años de construcción." },
        ],
        [
          { text: "0% comisión", style: "orange" },
          { text: " y pie en cuotas, único en propiedades usadas." },
        ],
      ],
      footer: DISCLAIMER,
    },
  ],
};
