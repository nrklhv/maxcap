-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "cantidad_propiedades" TEXT,
    "arrendadas" TEXT,
    "admin_houm" TEXT,
    "marketing_attribution" JSONB,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);
