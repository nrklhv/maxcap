-- CreateEnum
CREATE TYPE "HoumPropertyDraftStatus" AS ENUM ('PENDING', 'REJECTED', 'APPROVED');

-- CreateTable
CREATE TABLE "houm_property_drafts" (
    "id" TEXT NOT NULL,
    "houmPropertyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "metadata" JSONB,
    "status" "HoumPropertyDraftStatus" NOT NULL DEFAULT 'PENDING',
    "propertyId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "houm_property_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "houm_property_drafts_houmPropertyId_key" ON "houm_property_drafts"("houmPropertyId");

-- CreateIndex
CREATE UNIQUE INDEX "houm_property_drafts_propertyId_key" ON "houm_property_drafts"("propertyId");

-- AddForeignKey
ALTER TABLE "houm_property_drafts" ADD CONSTRAINT "houm_property_drafts_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
