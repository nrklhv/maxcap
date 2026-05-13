-- Producto 2: Pool de propiedades arrendadas.
-- Crea tablas `pools` y `pool_units` (independientes de `properties` para evitar
-- bugs por queries cruzadas), y extiende `reservations` con `poolUnitId` para
-- que una reserva pueda referirse a Producto 1 (propertyId) o a Producto 2
-- (poolUnitId), pero nunca a ambos a la vez (CHECK constraint).

-- 1) Enums
CREATE TYPE "PoolStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

CREATE TYPE "PoolUnitOcupacion" AS ENUM (
  'ARRENDADO',
  'VACANTE',
  'POR_DESOCUPARSE',
  'AVISO_SALIDA',
  'AVISADO_PARA_DESOCUPAR',
  'PUBLICADA'
);

CREATE TYPE "PoolUnitSaleStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD');

-- 2) Tabla pools
CREATE TABLE "pools" (
  "id"                    TEXT NOT NULL,
  "slug"                  TEXT NOT NULL,
  "name"                  TEXT NOT NULL,
  "description"           TEXT,
  "status"                "PoolStatus" NOT NULL DEFAULT 'OPEN',
  "acceptingReservations" BOOLEAN NOT NULL DEFAULT true,
  "capRateBruto"          DECIMAL(5,4) NOT NULL,
  "reservationFeeClp"     DECIMAL(12,2) NOT NULL,
  "totalUnits"            INTEGER NOT NULL DEFAULT 0,
  "totalValueUf"          DECIMAL(14,2),
  "totalMonthlyRentClp"   DECIMAL(14,2),
  "occupancyPct"          DOUBLE PRECISION,
  "metadata"              JSONB,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pools_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pools_slug_key" ON "pools"("slug");

-- 3) Tabla pool_units
CREATE TABLE "pool_units" (
  "id"                  TEXT NOT NULL,
  "poolId"              TEXT NOT NULL,
  "externalId"          TEXT NOT NULL,
  "label"               TEXT NOT NULL,
  "priceUf"             DECIMAL(10,2) NOT NULL,
  "priceClp"            DECIMAL(14,2) NOT NULL,
  "monthlyRentClp"      DECIMAL(12,2) NOT NULL,
  "ocupacion"           "PoolUnitOcupacion" NOT NULL DEFAULT 'VACANTE',
  "comuna"              TEXT,
  "dormitorios"         INTEGER,
  "banos"               INTEGER,
  "superficieUtilM2"    DOUBLE PRECISION,
  "superficieTerrazaM2" DOUBLE PRECISION,
  "internalData"        JSONB,
  "saleStatus"          "PoolUnitSaleStatus" NOT NULL DEFAULT 'AVAILABLE',
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pool_units_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pool_units_poolId_externalId_key" ON "pool_units"("poolId", "externalId");
CREATE INDEX "pool_units_poolId_saleStatus_idx" ON "pool_units"("poolId", "saleStatus");

ALTER TABLE "pool_units"
  ADD CONSTRAINT "pool_units_poolId_fkey"
  FOREIGN KEY ("poolId") REFERENCES "pools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4) Reservations: agregar poolUnitId, hacer propertyId nullable, agregar CHECK
ALTER TABLE "reservations" ALTER COLUMN "propertyId" DROP NOT NULL;
ALTER TABLE "reservations" ADD COLUMN "poolUnitId" TEXT;

CREATE INDEX "reservations_poolUnitId_idx" ON "reservations"("poolUnitId");

ALTER TABLE "reservations"
  ADD CONSTRAINT "reservations_poolUnitId_fkey"
  FOREIGN KEY ("poolUnitId") REFERENCES "pool_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CHECK: una reserva referencia exactamente uno de {propertyId, poolUnitId}.
-- Las filas legacy (todas con propertyId NOT NULL y poolUnitId NULL) pasan sin problema.
ALTER TABLE "reservations"
  ADD CONSTRAINT "reservations_target_xor_check"
  CHECK (
    ("propertyId" IS NOT NULL AND "poolUnitId" IS NULL)
    OR ("propertyId" IS NULL AND "poolUnitId" IS NOT NULL)
  );
