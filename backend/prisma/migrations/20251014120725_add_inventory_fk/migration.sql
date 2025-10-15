/*
  Warnings:

  - Added the required column `inventoryId` to the `PurchaseItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PurchaseItem" DROP CONSTRAINT "PurchaseItem_inventoryItemId_fkey";

-- DropIndex
DROP INDEX "public"."PurchaseItem_purchaseId_inventoryItemId_idx";


-- =========================================================================
-- STEP 1: ADD NEW TABLES (These are safe to run as they are new)
-- =========================================================================

-- CreateTable Machine
CREATE TABLE "Machine" (
    "id" SERIAL NOT NULL,
    "modelName" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT,
    "purchaseDate" TIMESTAMP(3),

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);

-- CreateTable ProductRecipe
CREATE TABLE "ProductRecipe" (
    "id" SERIAL NOT NULL,
    "designCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stitchesRequired" INTEGER NOT NULL,
    "frontDetail" TEXT,
    "backDetail" TEXT,

    CONSTRAINT "ProductRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable RecipeMaterial
CREATE TABLE "RecipeMaterial" (
    "recipeId" INTEGER NOT NULL,
    "inventoryId" INTEGER NOT NULL,
    "quantityRequired" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "RecipeMaterial_pkey" PRIMARY KEY ("recipeId","inventoryId")
);

-- CreateTable ProductionOrder
CREATE TABLE "ProductionOrder" (
    "id" SERIAL NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "targetQty" INTEGER NOT NULL,
    "actualOutputQty" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "machineId" INTEGER NOT NULL,
    "recipeId" INTEGER NOT NULL,

    CONSTRAINT "ProductionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable ProductionItem
CREATE TABLE "ProductionItem" (
    "id" SERIAL NOT NULL,
    "productionOrderId" INTEGER NOT NULL,
    "inventoryId" INTEGER NOT NULL,
    "quantityConsumed" DOUBLE PRECISION NOT NULL,
    "wastageQty" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "ProductionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable MachineLog
CREATE TABLE "MachineLog" (
    "id" SERIAL NOT NULL,
    "machineId" INTEGER NOT NULL,
    "logDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workingHours" DOUBLE PRECISION NOT NULL,
    "idleHours" DOUBLE PRECISION NOT NULL,
    "downtimeHours" DOUBLE PRECISION NOT NULL,
    "downtimeReason" TEXT,

    CONSTRAINT "MachineLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable OperatorEntry
CREATE TABLE "OperatorEntry" (
    "id" SERIAL NOT NULL,
    "operatorName" TEXT NOT NULL,
    "shiftDate" TIMESTAMP(3) NOT NULL,
    "clockInTime" TIMESTAMP(3) NOT NULL,
    "clockOutTime" TIMESTAMP(3),
    "productionOrderId" INTEGER,

    CONSTRAINT "OperatorEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Machine_modelName_key" ON "Machine"("modelName");

-- CreateIndex
CREATE UNIQUE INDEX "ProductRecipe_designCode_key" ON "ProductRecipe"("designCode");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionOrder_orderNumber_key" ON "ProductionOrder"("orderNumber");


-- =========================================================================
-- STEP 2: MANUAL MIGRATION AND DATA POPULATION (Data Loss Risk Area)
-- This block ensures existing PurchaseItem records get their required FK.
-- =========================================================================

-- 2a. AlterTable: Add the new required column temporarily as NULLABLE.
ALTER TABLE "PurchaseItem" ADD COLUMN "inventoryId" INTEGER;

-- 2b. UPDATE: Copy the integer ID (Inventory.id) by looking up the old string key (Inventory.itemId).
UPDATE "PurchaseItem" AS P
SET "inventoryId" = I.id
FROM "Inventory" AS I
WHERE P."inventoryItemId" = I."itemId";

-- 2c. AlterTable: Now that all existing rows are populated, set the column to NOT NULL.
ALTER TABLE "PurchaseItem" ALTER COLUMN "inventoryId" SET NOT NULL;


-- =========================================================================
-- STEP 3: ADD REMAINING CONSTRAINTS AND FOREIGN KEYS (Prisma Generated)
-- =========================================================================

-- CreateIndex
CREATE INDEX "PurchaseItem_purchaseId_inventoryId_idx" ON "PurchaseItem"("purchaseId", "inventoryId");

-- AddForeignKey (PurchaseItem)
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey (RecipeMaterial)
ALTER TABLE "RecipeMaterial" ADD CONSTRAINT "RecipeMaterial_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "ProductRecipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey (RecipeMaterial)
ALTER TABLE "RecipeMaterial" ADD CONSTRAINT "RecipeMaterial_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey (ProductionOrder)
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey (ProductionOrder)
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "ProductRecipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey (ProductionItem)
ALTER TABLE "ProductionItem" ADD CONSTRAINT "ProductionItem_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (ProductionItem)
ALTER TABLE "ProductionItem" ADD CONSTRAINT "ProductionItem_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey (MachineLog)
ALTER TABLE "MachineLog" ADD CONSTRAINT "MachineLog_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey (OperatorEntry)
ALTER TABLE "OperatorEntry" ADD CONSTRAINT "OperatorEntry_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;