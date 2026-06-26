-- CreateTable
CREATE TABLE "Jurisdiction" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subtype" TEXT,
    "parentId" TEXT,
    "state" TEXT,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Jurisdiction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LawCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LawCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicabilityVariable" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "ApplicabilityVariable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LawSource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "jurisdictionId" TEXT NOT NULL,
    "lawCategoryId" TEXT NOT NULL,
    "summary" TEXT,
    "structuredText" TEXT,
    "sourceUrl" TEXT,
    "sourceAuthority" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,

    CONSTRAINT "LawSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LawSourceApplicabilityVariable" (
    "lawSourceId" TEXT NOT NULL,
    "applicabilityVariableId" TEXT NOT NULL,

    CONSTRAINT "LawSourceApplicabilityVariable_pkey" PRIMARY KEY ("lawSourceId","applicabilityVariableId")
);

-- CreateIndex
CREATE INDEX "Jurisdiction_parentId_idx" ON "Jurisdiction"("parentId");

-- CreateIndex
CREATE INDEX "Jurisdiction_type_idx" ON "Jurisdiction"("type");

-- CreateIndex
CREATE INDEX "Jurisdiction_state_idx" ON "Jurisdiction"("state");

-- CreateIndex
CREATE INDEX "LawCategory_parentId_idx" ON "LawCategory"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicabilityVariable_path_key" ON "ApplicabilityVariable"("path");

-- CreateIndex
CREATE INDEX "ApplicabilityVariable_category_idx" ON "ApplicabilityVariable"("category");

-- CreateIndex
CREATE INDEX "LawSource_jurisdictionId_idx" ON "LawSource"("jurisdictionId");

-- CreateIndex
CREATE INDEX "LawSource_lawCategoryId_idx" ON "LawSource"("lawCategoryId");

-- CreateIndex
CREATE INDEX "LawSource_jurisdictionId_lawCategoryId_idx" ON "LawSource"("jurisdictionId", "lawCategoryId");

-- CreateIndex
CREATE INDEX "LawSourceApplicabilityVariable_applicabilityVariableId_idx" ON "LawSourceApplicabilityVariable"("applicabilityVariableId");

-- AddForeignKey
ALTER TABLE "Jurisdiction" ADD CONSTRAINT "Jurisdiction_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Jurisdiction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawCategory" ADD CONSTRAINT "LawCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "LawCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawSource" ADD CONSTRAINT "LawSource_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "Jurisdiction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawSource" ADD CONSTRAINT "LawSource_lawCategoryId_fkey" FOREIGN KEY ("lawCategoryId") REFERENCES "LawCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawSourceApplicabilityVariable" ADD CONSTRAINT "LawSourceApplicabilityVariable_lawSourceId_fkey" FOREIGN KEY ("lawSourceId") REFERENCES "LawSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawSourceApplicabilityVariable" ADD CONSTRAINT "LawSourceApplicabilityVariable_applicabilityVariableId_fkey" FOREIGN KEY ("applicabilityVariableId") REFERENCES "ApplicabilityVariable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
