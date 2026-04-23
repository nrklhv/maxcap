-- Optional link: investor User -> approved broker User (same table).

ALTER TABLE "users" ADD COLUMN "sponsorBrokerUserId" TEXT,
ADD COLUMN "sponsorBrokerAssignedAt" TIMESTAMP(3),
ADD COLUMN "sponsorBrokerAssignedByStaffUserId" TEXT;

CREATE INDEX "users_sponsorBrokerUserId_idx" ON "users"("sponsorBrokerUserId");

ALTER TABLE "users" ADD CONSTRAINT "users_sponsorBrokerUserId_fkey" FOREIGN KEY ("sponsorBrokerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
