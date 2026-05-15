-- "Preaprobación AVLA": verificación manual disparada por staff desde
-- /staff/inversionistas. Cada disparo crea una fila nueva (historial).
--
-- Detalle de la lógica de negocio y semántica: docs/AVLA.md.

CREATE TABLE "avla_checks" (
  "id"                    TEXT NOT NULL,
  "userId"                TEXT NOT NULL,
  "avlaLineId"            BIGINT,
  "state"                 TEXT,
  "stateTags"             TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "preapproved"           BOOLEAN,
  "requestedAmount"       INTEGER NOT NULL DEFAULT 1,
  "errorMessage"          TEXT,
  "rawResponse"           JSONB,
  "triggeredByStaffEmail" TEXT,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "avla_checks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "avla_checks_userId_createdAt_idx" ON "avla_checks"("userId", "createdAt" DESC);

ALTER TABLE "avla_checks"
  ADD CONSTRAINT "avla_checks_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
