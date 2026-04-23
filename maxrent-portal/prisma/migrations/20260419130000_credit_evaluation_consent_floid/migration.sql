-- Credit evaluation: consent audit fields + Floid case id for async / tracing
ALTER TABLE "credit_evaluations" ADD COLUMN "consentAt" TIMESTAMP(3),
ADD COLUMN "consentVersion" TEXT,
ADD COLUMN "floidCaseId" TEXT;

CREATE INDEX "credit_evaluations_floidCaseId_idx" ON "credit_evaluations"("floidCaseId");
