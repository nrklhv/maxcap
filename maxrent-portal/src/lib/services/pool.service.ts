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
import { INVESTOR_ACTIVE_RESERVATION_STATUSES } from "@/lib/portal/investor-active-reservation-statuses";

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

/**
 * Detalle público de una unidad **junto con** un resumen mínimo del pool al que
 * pertenece. Usado por la página de checkout `/reserva/pool-unit/[id]` para
 * mostrar la info de la unidad y el monto de reserva sin requerir un round-trip
 * adicional al detalle del pool.
 */
export async function getPublicPoolUnitWithPool(
  unitId: string
): Promise<{ unit: PublicPoolUnit; pool: PublicPoolDetail } | null> {
  const row = await prisma.poolUnit.findUnique({
    where: { id: unitId },
    select: {
      ...POOL_UNIT_PUBLIC_SELECT,
      pool: { select: POOL_PUBLIC_SELECT },
    },
  });
  if (!row) return null;
  if (row.pool.status === "DRAFT") return null;
  const { pool, ...unitFields } = row;
  return {
    unit: unitToPublic(unitFields),
    pool: poolToPublic(pool),
  };
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

// ============================================================================
// Vistas STAFF — incluyen `internalData` y reservas activas. NO usar para
// inversionista (esos consumen las funciones `Public*` de arriba).
// ============================================================================

/** Listado para staff: todos los pools (incluido DRAFT) con sus métricas. */
export async function listStaffPools() {
  return prisma.pool.findMany({
    select: POOL_PUBLIC_SELECT,
    orderBy: [{ createdAt: "desc" }],
  });
}

/**
 * Detalle staff de un pool: incluye todas las unidades con `internalData` y,
 * para las unidades con reserva activa, los datos básicos del inversionista que
 * la tomó. Pensado para `/staff/pools/[slug]`.
 */
export async function getStaffPoolDetail(slug: string) {
  const pool = await prisma.pool.findUnique({
    where: { slug },
    select: POOL_PUBLIC_SELECT,
  });
  if (!pool) return null;
  const units = await prisma.poolUnit.findMany({
    where: { poolId: pool.id },
    orderBy: [{ saleStatus: "asc" }, { priceUf: "asc" }],
    // No usamos POOL_UNIT_PUBLIC_SELECT acá: staff necesita ver internalData.
    include: {
      reservations: {
        where: { status: { in: [...INVESTOR_ACTIVE_RESERVATION_STATUSES] } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          amount: true,
          createdAt: true,
          expiresAt: true,
          paidAt: true,
          user: { select: { id: true, email: true, name: true } },
        },
      },
    },
  });
  return { pool, units };
}

// ============================================================================
// Reservación de unidades del pool — helpers usados por POST /api/reservations
// y por el webhook de pago. Análogos a los de Property:
//   - markPoolUnitReservedSync ←→ markPropertyReservedForInvestorSync
//   - reconcilePoolUnitAfterReservationChange ←→ reconcilePropertyAfterInvestorReservationChange
// ============================================================================

/**
 * Marca un `PoolUnit` como `RESERVED` dentro de una transacción. Se llama justo
 * después de crear la `Reservation` con `poolUnitId`.
 */
export async function markPoolUnitReservedSync(
  tx: Prisma.TransactionClient,
  poolUnitId: string
): Promise<void> {
  const unit = await tx.poolUnit.findUnique({ where: { id: poolUnitId } });
  if (!unit) throw new Error("PoolUnit not found for reservation sync");
  if (unit.saleStatus === "SOLD") throw new Error("UNIT_SOLD");
  await tx.poolUnit.update({
    where: { id: poolUnitId },
    data: { saleStatus: "RESERVED" },
  });
}

/**
 * Reconcilia el `saleStatus` de un `PoolUnit` después de un cambio en sus
 * `Reservation`s (webhook de pago, cancelación, etc.):
 *   - Si hay reserva activa → `RESERVED`.
 *   - Si no hay reserva activa y el unit no está `SOLD` → `AVAILABLE`.
 *   - `SOLD` nunca se revierte por este path (eso lo hace staff al escriturar).
 *
 * Idempotente. Acepta `null` (no-op) para callers que no saben si la reserva
 * era de pool o de property.
 */
export async function reconcilePoolUnitAfterReservationChange(
  poolUnitId: string | null,
  db: Pick<typeof prisma, "poolUnit" | "reservation"> = prisma
): Promise<void> {
  if (!poolUnitId) return;
  const unit = await db.poolUnit.findUnique({ where: { id: poolUnitId } });
  if (!unit) return;
  if (unit.saleStatus === "SOLD") return; // terminal

  const active = await db.reservation.findFirst({
    where: {
      poolUnitId,
      status: { in: [...INVESTOR_ACTIVE_RESERVATION_STATUSES] },
    },
  });
  const target: "RESERVED" | "AVAILABLE" = active ? "RESERVED" : "AVAILABLE";
  if (unit.saleStatus === target) return;
  await db.poolUnit.update({
    where: { id: poolUnitId },
    data: { saleStatus: target },
  });
}
