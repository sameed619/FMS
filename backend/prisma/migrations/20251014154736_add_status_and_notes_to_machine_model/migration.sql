-- AlterTable
ALTER TABLE "Machine" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Operational';
