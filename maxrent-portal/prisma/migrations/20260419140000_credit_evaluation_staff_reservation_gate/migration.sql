-- Gate staff: inversionista solo puede reservar si staff aprueba la evaluación completada.
ALTER TABLE "credit_evaluations" ADD COLUMN "staffReservationApprovedAt" TIMESTAMP(3),
ADD COLUMN "staffReservationApprovedByUserId" TEXT;
