-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "digital_signature" TEXT,
ADD COLUMN     "signature_date" TIMESTAMP(3),
ADD COLUMN     "step3_completed_at" TIMESTAMP(3);
