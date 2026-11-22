-- CreateTable
CREATE TABLE "RateLimitCounter" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DailyLlmUsage" (
    "dateKey" TEXT NOT NULL PRIMARY KEY,
    "callCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "RateLimitCounter_windowStart_idx" ON "RateLimitCounter"("windowStart");
