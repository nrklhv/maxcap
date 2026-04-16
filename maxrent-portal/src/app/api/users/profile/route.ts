// =============================================================================
// API: /api/users/profile
// GET  — Obtener perfil del usuario logueado (+ email de cuenta, solo lectura)
// PUT  — Actualizar perfil (onboarding + edición)
// =============================================================================

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const [profile, user] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId: session.user.id },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    }),
  ]);

  return NextResponse.json({
    profile,
    account: user?.email ? { loginEmail: user.email } : null,
  });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();

  const result = profileSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Datos inválidos", errors: result.error.issues },
      { status: 400 }
    );
  }

  const { firstName, lastName, contactEmail, rut, phone, address, commune, city } =
    result.data;

  const existingRut = await prisma.profile.findUnique({
    where: { rut },
  });

  if (existingRut && existingRut.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Este RUT ya está registrado por otro usuario" },
      { status: 409 }
    );
  }

  const existingContactEmail = await prisma.profile.findFirst({
    where: {
      contactEmail,
      userId: { not: session.user.id },
    },
  });

  if (existingContactEmail) {
    return NextResponse.json(
      { error: "Este email de contacto ya está registrado en otro perfil" },
      { status: 409 }
    );
  }

  const displayName = `${firstName} ${lastName}`.trim();

  const [profile] = await prisma.$transaction([
    prisma.profile.upsert({
      where: { userId: session.user.id },
      update: {
        firstName,
        lastName,
        contactEmail,
        rut,
        phone,
        address,
        commune,
        city,
        onboardingCompleted: true,
      },
      create: {
        userId: session.user.id,
        firstName,
        lastName,
        contactEmail,
        rut,
        phone,
        address,
        commune,
        city,
        onboardingCompleted: true,
      },
    }),
    prisma.user.update({
      where: { id: session.user.id },
      data: { name: displayName },
    }),
  ]);

  return NextResponse.json({ profile });
}
