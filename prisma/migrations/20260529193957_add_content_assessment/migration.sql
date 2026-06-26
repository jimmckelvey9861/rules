-- AlterTable
ALTER TABLE "CrawlerCandidate" ADD COLUMN     "actionableFacts" JSONB,
ADD COLUMN     "assessedAt" TIMESTAMP(3),
ADD COLUMN     "contentAssessmentStatus" TEXT NOT NULL DEFAULT 'unchecked',
ADD COLUMN     "contentAssessmentSummary" TEXT;
