-- AlterTable
ALTER TABLE "CrawlerCandidate" ADD COLUMN     "autoApprovalCheckedAt" TIMESTAMP(3),
ADD COLUMN     "autoApprovalNotes" TEXT,
ADD COLUMN     "autoApprovalSources" JSONB,
ADD COLUMN     "autoApprovalStatus" TEXT NOT NULL DEFAULT 'unchecked';
