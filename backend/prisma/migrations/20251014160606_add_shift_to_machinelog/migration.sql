-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('DAY', 'NIGHT', 'GENERAL');

-- AlterTable
ALTER TABLE "MachineLog" ADD COLUMN     "actualQtyProduced" DOUBLE PRECISION,
ADD COLUMN     "productionOrderId" INTEGER,
ADD COLUMN     "shift" "ShiftType" NOT NULL DEFAULT 'DAY',
ADD COLUMN     "wastageQty" DOUBLE PRECISION;

-- AddForeignKey
ALTER TABLE "MachineLog" ADD CONSTRAINT "MachineLog_productionOrderId_fkey" FOREIGN KEY ("productionOrderId") REFERENCES "ProductionOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
