// =============================================================================
// Batch 2026-05-04 — Lanzamiento orgánico mes 1 (FASE 1: 4 pilares)
// =============================================================================
// Plan completo del batch (14 piezas) acordado con el equipo el 2026-05-04.
// Esta primera fase incluye los 4 singles de pilares para validar estilo.
// Próximas fases: hero/presentación/alianza/FAQ singles → carruseles → CTA.
// =============================================================================

import type { Batch } from "../types";

export const batch: Batch = {
  fecha: "2026-05-04",
  nombre: "Lanzamiento orgánico — Mes 1",
  descripcion:
    "Primera tanda de piezas para feed de Instagram y Facebook. Fase 1: los 4 pilares de MaxRent como singles 1:1.",
  piezas: [
    {
      id: "pilar-01-cap-rate",
      titulo: "Pilar 01 · Cap rate +5%",
      formato: "1:1",
      tipo: "pilar",
      numero: "01",
      stat: "+5%",
      statLabel: "cap rate real",
      headline: "Compramos en bloque, conseguimos mejor precio.",
      bajada:
        "Como Club de 100 inversionistas calificados negociamos directo con operadores institucionales. Acceso a precios y cap rates que un comprador individual no consigue.",
    },
    {
      id: "pilar-02-comision",
      titulo: "Pilar 02 · 0% comisión",
      formato: "1:1",
      tipo: "pilar",
      numero: "02",
      stat: "0%",
      statLabel: "comisión de compra",
      headline: "Sin comisión y con el pie en cuotas.",
      bajada:
        "Único en propiedades usadas: 0% comisión y pie diferido en cuotas mensuales después de la escritura. El arriendo que recibes desde el día uno cubre ese pago.",
    },
    {
      id: "pilar-03-rentabilidad",
      titulo: "Pilar 03 · +30% rentabilidad",
      formato: "1:1",
      tipo: "pilar",
      numero: "03",
      stat: "+30%",
      statLabel: "rentabilidad vs. propiedad nueva",
      headline: "Rentabilidad real desde el día uno.",
      bajada:
        "Las propiedades del pool ya están arrendadas y operando. Conoces el contrato, al arrendatario y los costos. Sin proyecciones a tres años: la renta entra desde la escritura.",
    },
    {
      id: "pilar-04-pool",
      titulo: "Pilar 04 · Pool diversificado",
      formato: "1:1",
      tipo: "pilar",
      numero: "04",
      stat: "÷100",
      statLabel: "vacancia y morosidad diversificadas",
      headline: "Tu propiedad, con la estabilidad de un fondo.",
      bajada:
        "Tu inversión queda en un pool administrado por Houm. Si tu arrendatario se atrasa, sale o hay gastos extras, el pool absorbe el impacto y tu flujo se mantiene estable.",
    },
  ],
};
