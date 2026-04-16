-- Capacidades por usuario: canInvest + staffRole; elimina UserRole exclusivo

CREATE TYPE "StaffRole" AS ENUM ('NONE', 'SUPER_ADMIN');

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "canInvest" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "staffRole" "StaffRole" NOT NULL DEFAULT 'NONE';

-- Migrar desde columna legacy "role" si existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role'
  ) THEN
    UPDATE "users" SET "staffRole" = 'SUPER_ADMIN' WHERE "role"::text = 'ADMIN';
    UPDATE "users"
    SET "brokerAccessStatus" = 'PENDING'
    WHERE "role"::text = 'BROKER' AND "brokerAccessStatus" IS NULL;
    ALTER TABLE "users" DROP COLUMN "role";
  END IF;
END $$;

DROP TYPE IF EXISTS "UserRole";
