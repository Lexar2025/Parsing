-- AlterTable
ALTER TABLE "ProfessionDictionary" ADD COLUMN     "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN     "vacancyCount" INTEGER;

-- CreateIndex
CREATE INDEX "ProfessionDictionary_vacancyCount_idx" ON "ProfessionDictionary"("vacancyCount");
