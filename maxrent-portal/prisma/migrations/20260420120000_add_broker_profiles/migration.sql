-- CreateTable
CREATE TABLE "broker_profiles" (
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "isIndependent" BOOLEAN NOT NULL DEFAULT false,
    "websiteUrl" TEXT,
    "linkedinUrl" TEXT,
    "pitch" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broker_profiles_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "broker_profiles" ADD CONSTRAINT "broker_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
