-- =============================================================================
-- Atribución de referidos: Referral (peer-to-peer) + BrokerLead (comercial)
-- =============================================================================
-- Crea las dos tablas paralelas para tracking de atribución, junto con los
-- enums de status / payout y las columnas `investorReferralCode` /
-- `brokerReferralCode` en `users` que cada cuenta usa para compartir su link.
-- Detalle de diseño: docs/DATABASE.md sección "Atribución de referidos".
-- =============================================================================

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'SIGNED_UP', 'QUALIFIED', 'SIGNED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BrokerLeadStatus" AS ENUM ('NEW', 'SIGNED_UP', 'QUALIFIED', 'CONTRACT_SIGNED', 'LOST');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID');

-- AlterTable: codes que cada cuenta puede compartir como `?ref=<code>`.
-- Nullables hasta que el usuario cumpla la condición para generarlos
-- (canInvest=true para INV-, brokerAccessStatus=APPROVED para BRK-).
ALTER TABLE "users" ADD COLUMN "investorReferralCode" TEXT;
ALTER TABLE "users" ADD COLUMN "brokerReferralCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_investorReferralCode_key" ON "users"("investorReferralCode");

-- CreateIndex
CREATE UNIQUE INDEX "users_brokerReferralCode_key" ON "users"("brokerReferralCode");

-- CreateTable: Referral (peer-to-peer, $500.000 CLP fijos al referidor)
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "referrerUserId" TEXT NOT NULL,
    "referredEmail" TEXT NOT NULL,
    "referredUserId" TEXT,
    "leadId" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "signedUpAt" TIMESTAMP(3),
    "qualifiedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "rewardCLP" INTEGER NOT NULL DEFAULT 500000,
    "payoutStatus" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "payoutNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referredUserId_key" ON "referrals"("referredUserId");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_leadId_key" ON "referrals"("leadId");

-- CreateIndex
CREATE INDEX "referrals_referrerUserId_idx" ON "referrals"("referrerUserId");

-- CreateIndex
CREATE INDEX "referrals_code_idx" ON "referrals"("code");

-- CreateIndex
CREATE INDEX "referrals_status_idx" ON "referrals"("status");

-- CreateIndex
CREATE INDEX "referrals_payoutStatus_idx" ON "referrals"("payoutStatus");

-- CreateIndex
CREATE INDEX "referrals_expiresAt_idx" ON "referrals"("expiresAt");

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerUserId_fkey" FOREIGN KEY ("referrerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: BrokerLead (comercial, comisión variable a discreción de staff)
CREATE TABLE "broker_leads" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "brokerUserId" TEXT NOT NULL,
    "prospectEmail" TEXT NOT NULL,
    "prospectUserId" TEXT,
    "leadId" TEXT NOT NULL,
    "status" "BrokerLeadStatus" NOT NULL DEFAULT 'NEW',
    "signedUpAt" TIMESTAMP(3),
    "qualifiedAt" TIMESTAMP(3),
    "contractSignedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "payoutStatus" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "payoutNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broker_leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "broker_leads_prospectUserId_key" ON "broker_leads"("prospectUserId");

-- CreateIndex
CREATE UNIQUE INDEX "broker_leads_leadId_key" ON "broker_leads"("leadId");

-- CreateIndex
CREATE INDEX "broker_leads_brokerUserId_idx" ON "broker_leads"("brokerUserId");

-- CreateIndex
CREATE INDEX "broker_leads_code_idx" ON "broker_leads"("code");

-- CreateIndex
CREATE INDEX "broker_leads_status_idx" ON "broker_leads"("status");

-- CreateIndex
CREATE INDEX "broker_leads_payoutStatus_idx" ON "broker_leads"("payoutStatus");

-- CreateIndex
CREATE INDEX "broker_leads_expiresAt_idx" ON "broker_leads"("expiresAt");

-- AddForeignKey
ALTER TABLE "broker_leads" ADD CONSTRAINT "broker_leads_brokerUserId_fkey" FOREIGN KEY ("brokerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_leads" ADD CONSTRAINT "broker_leads_prospectUserId_fkey" FOREIGN KEY ("prospectUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_leads" ADD CONSTRAINT "broker_leads_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
