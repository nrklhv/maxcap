// =============================================================================
// Staff → Pools / [slug] — Detalle interno de un portafolio
// =============================================================================
// Muestra:
//   • Métricas del pool + controles de status / pausa / descripción.
//   • Tabla COMPLETA de unidades con dirección exacta, depto y estado raw del
//     Excel (vista interna; NO confundir con la pública de inversionista).
//   • Para unidades con reserva activa: usuario, monto, fechas y acciones
//     (cancelar reserva, escriturar → SOLD).
// =============================================================================

import { StaffPoolDetail } from "@/components/staff/staff-pool-detail";

type Props = { params: { slug: string } };

export default function StaffPoolDetailPage({ params }: Props) {
  return <StaffPoolDetail slug={params.slug} />;
}
