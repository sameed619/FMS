-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('Fabric', 'Thread');

-- CreateTable
CREATE TABLE "Inventory" (
    "id" SERIAL NOT NULL,
    "itemId" VARCHAR(10) NOT NULL,
    "itemType" "ItemType" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "stockQty" INTEGER NOT NULL DEFAULT 0,
    "unit" VARCHAR(20) NOT NULL,
    "supplier" VARCHAR(100) NOT NULL,
    "lastPurchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "billNumber" VARCHAR(50),
    "pricePerUnit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_itemId_key" ON "Inventory"("itemId");
