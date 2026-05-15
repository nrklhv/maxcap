/**
 * Staff: dispara un check de "preaprobación AVLA" para un usuario.
 *
 * Cada llamada hace una solicitud NUEVA a AVLA y persiste una fila nueva
 * en `AvlaCheck` (no reutiliza checks previos — el historial queda intacto).
 *
 * Pre-requisitos:
 * - El usuario debe tener `Profile.rut` Y `User.name` cargados (sino el botón
 *   debe estar deshabilitado en la UI, pero validamos también acá por defensa).
 * - Las env vars AVLA_* deben estar configuradas.
 *
 * Detalle del flujo y semántica de "preaprobado": docs/AVLA.md.
 *
 * @source POST /api/staff/users/[userId]/avla-check
 * @domain maxrent-portal / staff / avla
 */

import { NextResponse } from "next/server";
import { requireStaffSuperAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { checkPreapproval, isAvlaConfigured } from "@/lib/services/avla.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// El polling de AVLA puede tardar ~15s; subimos el máximo a 60s por seguridad.
export const maxDuration = 60;

export async function POST(
  _req: Request,
  { params }: { params: { userId: string } }
) {
  const session = await requireStaffSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!isAvlaConfigured()) {
    return NextResponse.json(
      { error: "AVLA no configurado (faltan env vars AVLA_*)" },
      { status: 503 }
    );
  }

  const userId = params.userId?.trim();
  if (!userId) {
    return NextResponse.json({ error: "userId requerido" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      canInvest: true,
      profile: { select: { rut: true, firstName: true, lastName: true } },
    },
  });

  if (!user || !user.canInvest) {
    return NextResponse.json({ error: "Inversionista no encontrado" }, { status: 404 });
  }

  const rut = user.profile?.rut?.trim();
  // Preferimos el nombre del Profile (firstName + lastName) si existe; fallback a User.name.
  const profileName = [user.profile?.firstName, user.profile?.lastName]
    .filter((s): s is string => Boolean(s?.trim()))
    .join(" ")
    .trim();
  const completeName = profileName || user.name?.trim() || "";

  if (!rut || !completeName) {
    return NextResponse.json(
      {
        error:
          "Falta perfil completo (RUT + nombre). El usuario debe completar el perfil antes de verificar DICOM.",
      },
      { status: 400 }
    );
  }

  // Ejecutar el check (NO lanza; siempre devuelve un resultado con preapproved/errorMessage).
  const result = await checkPreapproval({
    rut,
    completeName,
    triggeredByStaffEmail: session.user.email ?? undefined,
  });

  // Persistir SIEMPRE (incluso si falló — quedan los errores para debug en /staff).
  const saved = await prisma.avlaCheck.create({
    data: {
      userId: user.id,
      avlaLineId: result.avlaLineId,
      state: result.state,
      stateTags: result.stateTags,
      preapproved: result.preapproved,
      requestedAmount: 1,
      errorMessage: result.errorMessage,
      rawResponse: (result.rawResponse ?? null) as Prisma.InputJsonValue | typeof Prisma.JsonNull,
      triggeredByStaffEmail: session.user.email ?? null,
    },
    select: {
      id: true,
      preapproved: true,
      state: true,
      stateTags: true,
      errorMessage: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    ok: result.errorMessage === null,
    check: {
      ...saved,
      createdAt: saved.createdAt.toISOString(),
    },
  });
}
