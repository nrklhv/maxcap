/**
 * Service layer del Producto 2 (Pool). Centraliza queries de `Pool` y `PoolUnit`
 * para el inversionista y para staff, con un punto importante:
 *
 *   ❗ `PoolUnit.internalData` (dirección exacta, depto, fila raw) NO se expone
 *   nunca al inversionista. Cada función pública selecciona explícitamente los
 *   campos seguros — si agregas un campo, súmalo al select de manera consciente.
 *
 * @domain pool
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type {
  PublicPoolDetail,
  PublicPoolListItem,
  PublicPoolUnit,
} from "@/lib/pool/public-types";

// Re-export para conveniencia de los callers internos. Los Client Components
// deben importar directamente desde `@/lib/pool/public-types` para no arrastrar Prisma.
export type { PublicPoolDetail, PublicPoolListItem, PublicPoolUnit };

/** Selección segura de campos de `Pool` — usable como `Prisma.PoolSelect`. */
const POOL_PUBLIC_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  status: true,
  acceptingReservations: true,
  capRateBruto: true,
  reservationFeeClp: true,
  totalUnits: true,
  totalValueUf: true,
  totalMonthlyRentClp: true,
  occupancyPct: true,
} satisfies Prisma.PoolSelect;

/** Selección segura de campos de `PoolUnit` — **excluye `internalData`**. */
const POOL_UNIT_PUBLIC_SELECT = {
  id: true,
  externalId: true,
  label: true,
  priceUf: true,
  monthlyRentClp: true,
  ocupacion: true,
  comuna: true,
  dormitorios: true,
  banos: true,
  superficieUtilM2: true,
  superficieTerrazaM2: true,
  saleStatus: true,
} satisfies Prisma.PoolUnitSelect;

function poolToPublic(p: Prisma.PoolGetPayload<{ select: typeof POOL_PUBLIC_SELECT }>): PublicPoolListItem {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    status: p.status,
    acceptingReservations: p.acceptingReservations,
    capRateBruto: p.capRateBruto.toString(),
    reservationFeeClp: p.reservationFeeClp.toString(),
    totalUnits: p.totalUnits,
    totalValueUf: p.totalValueUf ? p.totalValueUf.toString() : null,
    totalMonthlyRentClp: p.totalMonthlyRentClp ? p.totalMonthlyRentClp.toString() : null,
    occupancyPct: p.occupancyPct,
  };
}

function unitToPublic(
  u: Prisma.PoolUnitGetPayload<{ select: typeof POOL_UNIT_PUBLIC_SELECT }>
): PublicPoolUnit {
  return {
    id: u.id,
    publicCode: `#${u.externalId}`,
    label: u.label,
    priceUf: u.priceUf.toString(),
    monthlyRentClp: u.monthlyRentClp.toString(),
    ocupacion: u.ocupacion,
    comuna: u.comuna,
    dormitorios: u.dormitorios,
    banos: u.banos,
    superficieUtilM2: u.superficieUtilM2,
    superficieTerrazaM2: u.superficieTerrazaM2,
    saleStatus: u.saleStatus,
  };
}

/**
 * Lista pools visibles al inversionista. `DRAFT` se oculta; `OPEN` y `CLOSED`
 * se muestran (el inversionista puede ver pools cerrados, pero no reservar en ellos).
 */
export async function listPublicPools(): Promise<PublicPoolListItem[]> {
  const rows = await prisma.pool.findMany({
    where: { status: { in: ["OPEN", "CLOSED"] } },
    select: POOL_PUBLIC_SELECT,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(poolToPublic);
}

/** Detalle público de un pool por slug, o `null` si no existe / es DRAFT. */
export async function getPublicPoolBySlug(slug: string): Promise<PublicPoolDetail | null> {
  const row = await prisma.pool.findUnique({
    where: { slug },
    select: POOL_PUBLIC_SELECT,
  });
  if (!row) return null;
  if (row.status === "DRAFT") return null;
  return poolToPublic(row);
}

/** Unidades públicas del pool (sin `internalData`), ordenadas por estado de venta y precio. */
export async function listPublicPoolUnits(poolId: string): Promise<PublicPoolUnit[]> {
  const rows = await prisma.poolUnit.findMany({
    where: { poolId },
    select: POOL_UNIT_PUBLIC_SELECT,
    orderBy: [{ saleStatus: "asc" }, { priceUf: "asc" }],
  });
  return rows.map(unitToPublic);
}
