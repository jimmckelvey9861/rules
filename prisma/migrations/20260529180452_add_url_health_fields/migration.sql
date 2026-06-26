-- AlterTable
ALTER TABLE "CrawlerCandidate" ADD COLUMN     "checkedAt" TIMESTAMP(3),
ADD COLUMN     "finalUrl" TEXT,
ADD COLUMN     "httpStatus" INTEGER,
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "originalUrl" TEXT,
ADD COLUMN     "urlHealthStatus" TEXT NOT NULL DEFAULT 'unchecked';

-- CreateIndex
CREATE INDEX "CrawlerCandidate_urlHealthStatus_idx" ON "CrawlerCandidate"("urlHealthStatus");
