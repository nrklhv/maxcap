// =============================================================================
// API: /api/users/profile
// GET  — Obtener perfil del usuario logueado (+ email de cuenta, solo lectura)
// PUT  — Actualizar perfil (onboarding + edición)
// =============================================================================

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isLaborProfileComplete } from "@/lib/portal/profile-labor";
import { profilePutSchema, type LaborProfileInput } from "@/lib/validations";
import type { Prisma } from "@prisma/client";

function isJsonObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Works across duplicate Prisma bundles where `instanceof` on Prisma errors can fail. */
function prismaErrorCode(e: unknown): string | undefined {
  if (typeof e === "object" && e !== null && "code" in e && typeof (e as { code: unknown }).code === "string") {
    return (e as { code: string }).code;
  }
  return undefined;
}

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
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
    }

    const result = profilePutSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Datos inválidos", errors: result.error.issues },
        { status: 400 }
      );
    }

    const { firstName, lastName, contactEmail, rut, phone, address, commune, city, labor } =
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

    const profile = await prisma.$transaction(async (tx) => {
      const existing = await tx.profile.findUnique({
        where: { userId: session.user.id },
        select: { additionalData: true },
      });

      const prevAdditional = isJsonObject(existing?.additionalData)
        ? { ...(existing!.additionalData as Record<string, unknown>) }
        : {};

      let additionalData: Prisma.InputJsonValue | undefined;
      if (labor !== undefined) {
        const laborPayload: LaborProfileInput & { updatedAt: string } = {
          ...labor,
          updatedAt: new Date().toISOString(),
        };
        additionalData = { ...prevAdditional, labor: laborPayload } as Prisma.InputJsonValue;
      }

      const mergedForOnboarding =
        additionalData !== undefined ? additionalData : prevAdditional;
      const onboardingCompleted = isLaborProfileComplete(mergedForOnboarding);

      const p = await tx.profile.upsert({
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
          onboardingCompleted,
          ...(additionalData !== undefined ? { additionalData } : {}),
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
          onboardingCompleted,
          ...(additionalData !== undefined ? { additionalData } : {}),
        },
      });
      await tx.user.update({
        where: { id: session.user.id },
        data: { name: displayName },
      });
      return p;
    });

    return NextResponse.json({ profile });
  } catch (e) {
    console.error("[profile PUT]", e);
    const code = prismaErrorCode(e);
    if (code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe otro perfil con ese RUT o email de contacto." },
        { status: 409 }
      );
    }
    if (code === "P2003") {
      return NextResponse.json(
        { error: "No se pudo vincular el perfil con tu cuenta. Cierra sesión y vuelve a entrar." },
        { status: 400 }
      );
    }
    if (code === "P2025") {
      return NextResponse.json({ error: "Usuario no encontrado. Vuelve a iniciar sesión." }, { status: 400 });
    }
    const devHint =
      process.env.NODE_ENV === "development" && e instanceof Error ? e.message : undefined;
    return NextResponse.json(
      {
        error: "Error interno al guardar el perfil. Intenta de nuevo en unos minutos.",
        ...(devHint ? { devHint } : {}),
      },
      { status: 500 }
    );
  }
}
