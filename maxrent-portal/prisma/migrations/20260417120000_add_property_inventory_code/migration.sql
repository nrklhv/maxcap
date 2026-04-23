-- AlterTable
ALTER TABLE "properties" ADD COLUMN "inventoryCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "properties_inventoryCode_key" ON "properties"("inventoryCode");
