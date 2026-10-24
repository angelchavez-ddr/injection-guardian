-- CreateTable
CREATE TABLE "Connector" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "configJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "correlationId" TEXT NOT NULL,
    "connectorId" TEXT,
    "source" TEXT NOT NULL,
    "externalId" TEXT,
    "simulated" BOOLEAN NOT NULL DEFAULT false,
    "metadataOnly" BOOLEAN NOT NULL DEFAULT false,
    "stage" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "confidence" REAL NOT NULL,
    "summary" TEXT NOT NULL,
    "requiresHumanReview" BOOLEAN NOT NULL DEFAULT false,
    "attackTypesJson" TEXT NOT NULL DEFAULT '[]',
    "recommendationsJson" TEXT NOT NULL DEFAULT '[]',
    "indicatorsJson" TEXT NOT NULL DEFAULT '[]',
    "excerpt" TEXT,
    "subject" TEXT,
    "policyDecision" TEXT NOT NULL,
    "policyReason" TEXT NOT NULL,
    "policyActionsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SecurityEvent_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "Connector" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnalysisResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "status" TEXT NOT NULL,
    "reportedConfidence" REAL,
    "advisoryScore" INTEGER,
    "advisorySeverity" TEXT,
    "advisorySummary" TEXT,
    "modelIndicatorsJson" TEXT NOT NULL DEFAULT '[]',
    "advisoryRecommendationsJson" TEXT NOT NULL DEFAULT '[]',
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalysisResult_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SecurityEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT,
    "correlationId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT,
    "severity" TEXT,
    "riskScore" INTEGER,
    "indicatorsJson" TEXT NOT NULL DEFAULT '[]',
    "policyDecision" TEXT NOT NULL,
    "policyReason" TEXT NOT NULL,
    "aiProvider" TEXT,
    "aiModel" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SecurityEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SecurityEvent_severity_idx" ON "SecurityEvent"("severity");

-- CreateIndex
CREATE INDEX "SecurityEvent_status_idx" ON "SecurityEvent"("status");

-- CreateIndex
CREATE INDEX "SecurityEvent_createdAt_idx" ON "SecurityEvent"("createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_correlationId_idx" ON "SecurityEvent"("correlationId");

-- CreateIndex
CREATE INDEX "SecurityEvent_requiresHumanReview_idx" ON "SecurityEvent"("requiresHumanReview");

-- CreateIndex
CREATE UNIQUE INDEX "SecurityEvent_source_externalId_key" ON "SecurityEvent"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisResult_eventId_key" ON "AnalysisResult"("eventId");

-- CreateIndex
CREATE INDEX "AuditLog_correlationId_idx" ON "AuditLog"("correlationId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_eventId_idx" ON "AuditLog"("eventId");
