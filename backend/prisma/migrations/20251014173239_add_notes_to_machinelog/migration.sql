/*
  Warnings:

  - You are about to drop the column `actualOutputQty` on the `ProductionOrder` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MachineLog" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "ProductionOrder" DROP COLUMN "actualOutputQty";
