-- Floid Widget integration: nuevas columnas en credit_evaluations
-- - downloadPdfUrl: URL absoluta al PDF generado por Floid (campo `download_pdf` del widget callback)
-- - staffNotes: notas internas del equipo staff sobre la evaluación (no visibles al inversionista)
ALTER TABLE "credit_evaluations" ADD COLUMN "downloadPdfUrl" TEXT,
ADD COLUMN "staffNotes" TEXT;
