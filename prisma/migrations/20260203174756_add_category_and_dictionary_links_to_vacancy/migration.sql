-- AlterTable
ALTER TABLE "Vacancy" ADD COLUMN     "category" TEXT,
ADD COLUMN     "professionDictionaryIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "Vacancy_category_idx" ON "Vacancy"("category");

-- CreateIndex
CREATE INDEX "Vacancy_workLocationType_idx" ON "Vacancy"("workLocationType");

-- CreateIndex
CREATE INDEX "Vacancy_professionDictionaryIds_idx" ON "Vacancy"("professionDictionaryIds");
