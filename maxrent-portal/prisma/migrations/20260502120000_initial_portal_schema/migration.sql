-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('NONE', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "BrokerAccessStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BrokerInvestorInviteStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CatalogDraftSource" AS ENUM ('HOUM', 'CSV');

-- CreateEnum
CREATE TYPE "PropertyCatalogDraftStatus" AS ENUM ('PENDING', 'REJECTED', 'APPROVED');

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PENDING_PAYMENT', 'PAYMENT_PROCESSING', 'PAID', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "LeadKind" AS ENUM ('INVESTOR', 'SELLER');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'INVITED', 'REGISTERED', 'CONVERTED', 'DISCARDED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "canInvest" BOOLEAN NOT NULL DEFAULT true,
    "staffRole" "StaffRole" NOT NULL DEFAULT 'NONE',
    "leadId" TEXT,
    "brokerAccessStatus" "BrokerAccessStatus",
    "brokerReviewedAt" TIMESTAMP(3),
    "sponsorBrokerUserId" TEXT,
    "sponsorBrokerAssignedAt" TIMESTAMP(3),
    "sponsorBrokerAssignedByStaffUserId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "contactEmail" TEXT,
    "rut" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "commune" TEXT,
    "city" TEXT,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "additionalData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "credit_evaluations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'PENDING',
    "score" INTEGER,
    "riskLevel" "RiskLevel",
    "maxApprovedAmount" DECIMAL(12,2),
    "summary" TEXT,
    "rawResponse" JSONB,
    "errorMessage" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "consentAt" TIMESTAMP(3),
    "consentVersion" TEXT,
    "floidCaseId" TEXT,
    "downloadPdfUrl" TEXT,
    "staffNotes" TEXT,
    "staffReservationApprovedAt" TIMESTAMP(3),
    "staffReservationApprovedByUserId" TEXT,

    CONSTRAINT "credit_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "evaluationId" TEXT,
    "propertyId" TEXT NOT NULL,
    "propertyName" TEXT,
    "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "paymentExternalId" TEXT,
    "paymentMethod" TEXT,
    "paymentUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "kind" "LeadKind" NOT NULL DEFAULT 'INVESTOR',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "firstName" TEXT,
    "lastName" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "cantidadPropiedades" TEXT,
    "arrendadas" TEXT,
    "adminHoum" TEXT,
    "source" TEXT,
    "marketingAttribution" JSONB,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "PropertyStatus" NOT NULL DEFAULT 'AVAILABLE',
    "visibleToBrokers" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "inventoryCode" TEXT,
    "houmPropertyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_catalog_drafts" (
    "id" TEXT NOT NULL,
    "source" "CatalogDraftSource" NOT NULL,
    "houmPropertyId" TEXT,
    "inventoryCode" TEXT,
    "title" TEXT NOT NULL,
    "metadata" JSONB,
    "status" "PropertyCatalogDraftStatus" NOT NULL DEFAULT 'PENDING',
    "pendingPropertyStatus" "PropertyStatus",
    "pendingVisibleToBrokers" BOOLEAN,
    "propertyId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_catalog_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_leadId_key" ON "users"("leadId");

-- CreateIndex
CREATE INDEX "users_sponsorBrokerUserId_idx" ON "users"("sponsorBrokerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_userId_key" ON "profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_contactEmail_key" ON "profiles"("contactEmail");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_rut_key" ON "profiles"("rut");

-- CreateIndex
CREATE INDEX "credit_evaluations_userId_status_idx" ON "credit_evaluations"("userId", "status");

-- CreateIndex
CREATE INDEX "credit_evaluations_floidCaseId_idx" ON "credit_evaluations"("floidCaseId");

-- CreateIndex
CREATE INDEX "reservations_userId_status_idx" ON "reservations"("userId", "status");

-- CreateIndex
CREATE INDEX "reservations_paymentExternalId_idx" ON "reservations"("paymentExternalId");

-- CreateIndex
CREATE UNIQUE INDEX "broker_investor_invites_token_key" ON "broker_investor_invites"("token");

-- CreateIndex
CREATE INDEX "broker_investor_invites_brokerUserId_idx" ON "broker_investor_invites"("brokerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "leads_email_key" ON "leads"("email");

-- CreateIndex
CREATE INDEX "leads_kind_status_idx" ON "leads"("kind", "status");

-- CreateIndex
CREATE UNIQUE INDEX "properties_inventoryCode_key" ON "properties"("inventoryCode");

-- CreateIndex
CREATE UNIQUE INDEX "properties_houmPropertyId_key" ON "properties"("houmPropertyId");

-- CreateIndex
CREATE INDEX "properties_status_idx" ON "properties"("status");

-- CreateIndex
CREATE UNIQUE INDEX "property_catalog_drafts_houmPropertyId_key" ON "property_catalog_drafts"("houmPropertyId");

-- CreateIndex
CREATE UNIQUE INDEX "property_catalog_drafts_inventoryCode_key" ON "property_catalog_drafts"("inventoryCode");

-- CreateIndex
CREATE UNIQUE INDEX "property_catalog_drafts_propertyId_key" ON "property_catalog_drafts"("propertyId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_sponsorBrokerUserId_fkey" FOREIGN KEY ("sponsorBrokerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_profiles" ADD CONSTRAINT "broker_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_evaluations" ADD CONSTRAINT "credit_evaluations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "credit_evaluations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_investor_invites" ADD CONSTRAINT "broker_investor_invites_brokerUserId_fkey" FOREIGN KEY ("brokerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broker_investor_invites" ADD CONSTRAINT "broker_investor_invites_registeredUserId_fkey" FOREIGN KEY ("registeredUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_catalog_drafts" ADD CONSTRAINT "property_catalog_drafts_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

