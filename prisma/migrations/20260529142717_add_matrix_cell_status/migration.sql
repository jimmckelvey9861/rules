-- CreateTable
CREATE TABLE "MatrixCellStatus" (
    "id" TEXT NOT NULL,
    "jurisdictionId" TEXT NOT NULL,
    "lawCategoryId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatrixCellStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatrixCellStatus_jurisdictionId_idx" ON "MatrixCellStatus"("jurisdictionId");

-- CreateIndex
CREATE INDEX "MatrixCellStatus_lawCategoryId_idx" ON "MatrixCellStatus"("lawCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "MatrixCellStatus_jurisdictionId_lawCategoryId_key" ON "MatrixCellStatus"("jurisdictionId", "lawCategoryId");

-- AddForeignKey
ALTER TABLE "MatrixCellStatus" ADD CONSTRAINT "MatrixCellStatus_jurisdictionId_fkey" FOREIGN KEY ("jurisdictionId") REFERENCES "Jurisdiction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatrixCellStatus" ADD CONSTRAINT "MatrixCellStatus_lawCategoryId_fkey" FOREIGN KEY ("lawCategoryId") REFERENCES "LawCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
