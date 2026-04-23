-- CreateEnum
CREATE TYPE "BrokerInvestorInviteStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED');

-- CreateTable
CREATE TABLE "broker_investor_invites" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "brokerUserId" TEXT NOT NULL,
    "inviteeEmail" TEXT,
    "status" "BrokerInvestorInviteStatus" NOT NULL DEFAULT 'PENDING',
    "registeredUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "broker_investor_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "broker_investor_invites_token_key" ON "broker_investor_invites"("token");

-- CreateIndex
CREATE INDEX "broker_investor_invites_brokerUserId_idx" ON "broker_investor_invites"("brokerUserId");

-- AddForeignKey
ALTER TABLE "broker_investor_invites" ADD CONSTRAINT "broker_investor_invites_brokerUserId_fkey" FOREIGN KEY ("brokerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_investor_invites" ADD CONSTRAINT "broker_investor_invites_registeredUserId_fkey" FOREIGN KEY ("registeredUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
