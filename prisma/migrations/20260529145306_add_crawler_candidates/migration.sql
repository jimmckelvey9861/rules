-- CreateTable
CREATE TABLE "CrawlerCandidate" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "sourceAuthority" TEXT,
    "guessedJurisdictionId" TEXT,
    "guessedLawCategoryId" TEXT,
    "summary" TEXT,
    "rawText" TEXT,
    "rawPayload" JSONB,
    "confidence" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'new',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrawlerCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrawlerCandidate_status_idx" ON "CrawlerCandidate"("status");

-- CreateIndex
CREATE INDEX "CrawlerCandidate_guessedJurisdictionId_idx" ON "CrawlerCandidate"("guessedJurisdictionId");

-- CreateIndex
CREATE INDEX "CrawlerCandidate_guessedLawCategoryId_idx" ON "CrawlerCandidate"("guessedLawCategoryId");

-- AddForeignKey
ALTER TABLE "CrawlerCandidate" ADD CONSTRAINT "CrawlerCandidate_guessedJurisdictionId_fkey" FOREIGN KEY ("guessedJurisdictionId") REFERENCES "Jurisdiction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrawlerCandidate" ADD CONSTRAINT "CrawlerCandidate_guessedLawCategoryId_fkey" FOREIGN KEY ("guessedLawCategoryId") REFERENCES "LawCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
