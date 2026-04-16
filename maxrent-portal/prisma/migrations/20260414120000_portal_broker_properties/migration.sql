-- Portal broker: rol BROKER, aprobación brokers, catálogo propiedades

-- CreateEnum
CREATE TYPE "BrokerAccessStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD', 'ARCHIVED');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'BROKER';

-- AlterTable
ALTER TABLE "users" ADD COLUMN "brokerAccessStatus" "BrokerAccessStatus",
ADD COLUMN "brokerReviewedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "PropertyStatus" NOT NULL DEFAULT 'AVAILABLE',
    "visibleToBrokers" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "properties_status_idx" ON "properties"("status");
