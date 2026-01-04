-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'ru',
    "notificationsOn" BOOLEAN NOT NULL DEFAULT true,
    "maxNotifications" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "filters" JSONB NOT NULL,
    "sources" TEXT[],
    "lastNotified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vacancy" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "salaryCurrency" TEXT,
    "experience" TEXT,
    "employment" TEXT,
    "schedule" TEXT,
    "skills" TEXT[],
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "rawData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vacancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParseLog" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "vacanciesFound" INTEGER NOT NULL DEFAULT 0,
    "vacanciesNew" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParseLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- CreateIndex
CREATE INDEX "Subscription_userId_isActive_idx" ON "Subscription"("userId", "isActive");

-- CreateIndex
CREATE INDEX "Vacancy_source_publishedAt_idx" ON "Vacancy"("source", "publishedAt");

-- CreateIndex
CREATE INDEX "Vacancy_location_idx" ON "Vacancy"("location");

-- CreateIndex
CREATE INDEX "Vacancy_salaryMin_salaryMax_idx" ON "Vacancy"("salaryMin", "salaryMax");

-- CreateIndex
CREATE UNIQUE INDEX "Vacancy_source_sourceId_key" ON "Vacancy"("source", "sourceId");

-- CreateIndex
CREATE INDEX "ParseLog_source_createdAt_idx" ON "ParseLog"("source", "createdAt");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
