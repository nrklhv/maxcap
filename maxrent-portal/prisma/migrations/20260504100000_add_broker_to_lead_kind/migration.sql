-- AlterEnum: agrega BROKER al enum LeadKind para soportar leads del programa
-- Brokers Externos (form en https://www.maxrent.cl/brokers).
ALTER TYPE "LeadKind" ADD VALUE IF NOT EXISTS 'BROKER';
