-- AlterTable
ALTER TABLE "CrawlerCandidate" ADD COLUMN     "checkedMethod" TEXT,
ADD COLUMN     "contentLength" INTEGER,
ADD COLUMN     "contentType" TEXT,
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "repairedFromUrl" TEXT,
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0;
