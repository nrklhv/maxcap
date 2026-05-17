-- UF chilena cacheada por día. Cron diario hace upsert desde mindicador.cl.
-- El portal usa el último valor para mostrar precio referencial en CLP al lado de UF.
-- Detalle: docs/UF_RATE.md (a crear).

CREATE TABLE "uf_rates" (
  "id"        TEXT NOT NULL,
  "date"      DATE NOT NULL,
  "valueClp"  DECIMAL(12, 2) NOT NULL,
  "source"    TEXT NOT NULL DEFAULT 'mindicador.cl',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "uf_rates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uf_rates_date_key" ON "uf_rates"("date");
CREATE INDEX "uf_rates_date_idx" ON "uf_rates"("date" DESC);
