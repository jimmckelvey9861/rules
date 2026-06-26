-- AlterTable
ALTER TABLE "LawSource" ADD COLUMN     "verificationNotes" TEXT,
ADD COLUMN     "verificationStatus" TEXT NOT NULL DEFAULT 'auto_generated';
