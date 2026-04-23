-- Unified catalog drafts (Houm + CSV staging).

CREATE TYPE "CatalogDraftSource" AS ENUM ('HOUM', 'CSV');

ALTER TYPE "HoumPropertyDraftStatus" RENAME TO "PropertyCatalogDraftStatus";

ALTER TABLE "houm_property_drafts" RENAME TO "property_catalog_drafts";

ALTER TABLE "property_catalog_drafts" RENAME CONSTRAINT "houm_property_drafts_pkey" TO "property_catalog_drafts_pkey";

ALTER TABLE "property_catalog_drafts" RENAME CONSTRAINT "houm_property_drafts_propertyId_fkey" TO "property_catalog_drafts_propertyId_fkey";

ALTER INDEX "houm_property_drafts_houmPropertyId_key" RENAME TO "property_catalog_drafts_houmPropertyId_key";

ALTER INDEX "houm_property_drafts_propertyId_key" RENAME TO "property_catalog_drafts_propertyId_key";

ALTER TABLE "property_catalog_drafts" ALTER COLUMN "houmPropertyId" DROP NOT NULL;

ALTER TABLE "property_catalog_drafts" ADD COLUMN "source" "CatalogDraftSource" NOT NULL DEFAULT 'HOUM';

ALTER TABLE "property_catalog_drafts" ADD COLUMN "inventoryCode" TEXT;

CREATE UNIQUE INDEX "property_catalog_drafts_inventoryCode_key" ON "property_catalog_drafts"("inventoryCode");

ALTER TABLE "property_catalog_drafts" ADD COLUMN "pendingPropertyStatus" "PropertyStatus";

ALTER TABLE "property_catalog_drafts" ADD COLUMN "pendingVisibleToBrokers" BOOLEAN;
