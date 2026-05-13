/**
 * Tipos públicos del Producto 2 (Pool) **sin dependencias de Prisma**.
 * Pensados para importarse desde Client Components — el service layer
 * (`@/lib/services/pool.service`) re-exporta estos tipos para no duplicarlos.
 *
 * @domain pool
 */

/** Shape pública de un Pool en listados al inversionista. */
export type PublicPoolListItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: "DRAFT" | "OPEN" | "CLOSED";
  acceptingReservations: boolean;
  /** Decimal serializado como string. Ej. "0.0580". */
  capRateBruto: string;
  /** Decimal serializado como string. Monto CLP de la reserva por unidad. */
  reservationFeeClp: string;
  totalUnits: number;
  totalValueUf: string | null;
  totalMonthlyRentClp: string | null;
  occupancyPct: number | null;
};

/** Shape pública del detalle de un Pool. */
export type PublicPoolDetail = PublicPoolListItem;

/**
 * Shape pública de una `PoolUnit` para inversionista.
 *
 * ⚠️ Excluye intencionalmente `internalData` (dirección exacta, depto, raw),
 * que solo se sirve a staff. Si agregas un campo público nuevo, súmalo acá
 * y al `POOL_UNIT_PUBLIC_SELECT` en `pool.service.ts` (no al revés).
 */
export type PublicPoolUnit = {
  id: string;
  /** Identificador estable para mostrar (ej. "#167889"). */
  publicCode: string;
  label: string;
  /** Decimal serializado. Precio derivado: `monthlyRent × 12 / capRate / UF`. */
  priceUf: string;
  monthlyRentClp: string;
  ocupacion:
    | "ARRENDADO"
    | "VACANTE"
    | "POR_DESOCUPARSE"
    | "AVISO_SALIDA"
    | "AVISADO_PARA_DESOCUPAR"
    | "PUBLICADA";
  comuna: string | null;
  dormitorios: number | null;
  banos: number | null;
  superficieUtilM2: number | null;
  superficieTerrazaM2: number | null;
  saleStatus: "AVAILABLE" | "RESERVED" | "SOLD";
};
