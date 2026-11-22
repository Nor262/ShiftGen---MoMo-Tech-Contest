-- CreateTable
CREATE TABLE "UserConsent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "demoSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "optIn24hHold" BOOLEAN NOT NULL DEFAULT false,
    "guardianId" TEXT,
    "consentVersion" TEXT NOT NULL,
    "consentedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ScanSession" (
    "scanId" TEXT NOT NULL PRIMARY KEY,
    "demoSessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inputType" TEXT NOT NULL,
    "imageHash" TEXT,
    "riskScore" INTEGER NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "resultJson" TEXT NOT NULL,
    "sanitizedEvidenceJson" TEXT NOT NULL,
    "piiDiffJson" TEXT NOT NULL,
    "immunityHitId" TEXT,
    "modelUsed" TEXT NOT NULL,
    "measuredLatencyMs" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "HeldTransaction" (
    "txId" TEXT NOT NULL PRIMARY KEY,
    "demoSessionId" TEXT NOT NULL,
    "scanId" TEXT,
    "senderId" TEXT NOT NULL,
    "senderLabel" TEXT NOT NULL,
    "recipientAccount" TEXT NOT NULL,
    "recipientBank" TEXT NOT NULL,
    "amountVnd" REAL NOT NULL,
    "status" TEXT NOT NULL,
    "neutralMessage" TEXT NOT NULL,
    "holdExpiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "InvestigationCase" (
    "caseId" TEXT NOT NULL PRIMARY KEY,
    "demoSessionId" TEXT NOT NULL,
    "txId" TEXT,
    "scenarioCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "graphDataJson" TEXT NOT NULL,
    "caseContextJson" TEXT NOT NULL,
    "sanitizedMinute0Json" TEXT,
    "agentDebateJson" TEXT,
    "totalLatencyMs" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ImmunityIndicator" (
    "indicatorId" TEXT NOT NULL PRIMARY KEY,
    "demoSessionId" TEXT NOT NULL,
    "caseId" TEXT,
    "indicatorType" TEXT NOT NULL,
    "indicatorValue" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "evidenceSourcesJson" TEXT NOT NULL,
    "makerId" TEXT NOT NULL,
    "checkerId" TEXT,
    "ttlHours" INTEGER NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "rollbackReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Appeal" (
    "appealId" TEXT NOT NULL PRIMARY KEY,
    "demoSessionId" TEXT NOT NULL,
    "indicatorId" TEXT NOT NULL,
    "appellantName" TEXT NOT NULL,
    "appellantNote" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reviewerId" TEXT,
    "resolutionNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "logId" TEXT NOT NULL PRIMARY KEY,
    "demoSessionId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "UserConsent_demoSessionId_idx" ON "UserConsent"("demoSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserConsent_demoSessionId_userId_key" ON "UserConsent"("demoSessionId", "userId");

-- CreateIndex
CREATE INDEX "ScanSession_demoSessionId_createdAt_idx" ON "ScanSession"("demoSessionId", "createdAt");

-- CreateIndex
CREATE INDEX "HeldTransaction_demoSessionId_status_idx" ON "HeldTransaction"("demoSessionId", "status");

-- CreateIndex
CREATE INDEX "InvestigationCase_demoSessionId_createdAt_idx" ON "InvestigationCase"("demoSessionId", "createdAt");

-- CreateIndex
CREATE INDEX "ImmunityIndicator_demoSessionId_indicatorValue_idx" ON "ImmunityIndicator"("demoSessionId", "indicatorValue");

-- CreateIndex
CREATE INDEX "ImmunityIndicator_demoSessionId_status_idx" ON "ImmunityIndicator"("demoSessionId", "status");

-- CreateIndex
CREATE INDEX "Appeal_demoSessionId_status_idx" ON "Appeal"("demoSessionId", "status");

-- CreateIndex
CREATE INDEX "AuditLog_demoSessionId_createdAt_idx" ON "AuditLog"("demoSessionId", "createdAt");
