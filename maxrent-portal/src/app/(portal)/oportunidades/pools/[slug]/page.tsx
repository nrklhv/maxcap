// =============================================================================
// Oportunidades / Pools / [slug] — Detalle del pool con grilla de unidades
// =============================================================================
// El detalle carga el pool por slug + sus unidades públicas (sin `internalData`).
// El botón Reservar de cada unidad sigue el mismo gate que Producto 1: requiere
// evaluación COMPLETED + aprobación staff.
// =============================================================================

import { PoolDetailFromApi } from "@/components/portal/pool-detail-from-api";

type Props = { params: { slug: string } };

export default function PoolDetailPage({ params }: Props) {
  return <PoolDetailFromApi slug={params.slug} />;
}
