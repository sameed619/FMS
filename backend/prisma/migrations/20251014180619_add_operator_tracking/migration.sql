/*
  Warnings:

  - You are about to drop the column `clockInTime` on the `OperatorEntry` table. All the data in the column will be lost.
  - You are about to drop the column `clockOutTime` on the `OperatorEntry` table. All the data in the column will be lost.
  - You are about to drop the column `operatorName` on the `OperatorEntry` table. All the data in the column will be lost.
  - You are about to drop the column `shiftDate` on the `OperatorEntry` table. All the data in the column will be lost.
  - Added the required column `operatorId` to the `OperatorEntry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startTime` to the `OperatorEntry` table without a default value. This is not possible if the table is not empty.
  - Made the column `productionOrderId` on table `OperatorEntry` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."OperatorEntry" DROP CONSTRAINT "OperatorEntry_productionOrderId_fkey";

-- AlterTable
ALTER TABLE "OperatorEntry" DROP COLUMN "clockInTime",
DROP COLUMN "clockOutTime",
DROP COLUMN "operatorName",
DROP COLUMN "shiftDate",
ADD COLUMN     "activityType" TEXT,
ADD COLUMN     "durationMinutes" DOUBLE PRECISION,
ADD COLUMN     "endTime" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "operatorId" INTEGER NOT NULL,
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "productionOrderId" SET NOT NULL;

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Operator',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- AddForeignKey
ALTER TABLE "OperatorEntry" ADD CONSTRAINT "OperatorEntry_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperatorEntry" ADD CONSTRAINT "OperatorEntry_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
