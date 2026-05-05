-- =============================================================================
-- MarketingAccess: allowlist de correos para marketing.maxrent.cl
-- =============================================================================
-- Tabla compartida entre portal (donde viven las migraciones) y la app de
-- marketing (que sólo lee/escribe esta tabla via @neondatabase/serverless,
-- sin Prisma). Super-admins viven en env var MARKETING_SUPER_ADMINS — no se
-- almacenan en BD para no requerir bootstrap.
-- =============================================================================

CREATE TABLE "marketing_access" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "addedBy" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_access_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "marketing_access_email_key" ON "marketing_access"("email");
