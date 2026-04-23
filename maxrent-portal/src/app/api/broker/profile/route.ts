import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { brokerProfilePatchSchema } from "@/lib/broker/broker-profile-schema";
import * as brokerService from "@/lib/services/broker.service";

function serializeProfile(row: Awaited<ReturnType<typeof brokerService.getBrokerProfileByUserId>>) {
  if (!row) {
    return {
      companyName: "",
      jobTitle: "",
      isIndependent: false,
      websiteUrl: null as string | null,
      linkedinUrl: null as string | null,
      pitch: null as string | null,
      updatedAt: null as string | null,
    };
  }
  return {
    companyName: row.companyName,
    jobTitle: row.jobTitle,
    isIndependent: row.isIndependent,
    websiteUrl: row.websiteUrl,
    linkedinUrl: row.linkedinUrl,
    pitch: row.pitch,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Read or update the authenticated user's broker commercial profile.
 *
 * @source GET|PATCH /api/broker/profile
 */
export async function GET() {
  try {
    const session = await requireUser();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const row = await brokerService.getBrokerProfileByUserId(session.user.id);
    const complete = await brokerService.userHasCompleteBrokerProfile(session.user.id);
    return NextResponse.json({ profile: serializeProfile(row), complete });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    const prismaCode =
      typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : "";
    console.error("[GET /api/broker/profile]", e);
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? "No se pudo cargar el perfil comercial. Revisá migraciones (`node scripts/prisma-with-merged-env.cjs migrate deploy`) y el log del servidor."
            : "No se pudo cargar el perfil comercial.",
        ...(process.env.NODE_ENV === "development" ? { debug: { prismaCode, errMsg: errMsg.slice(0, 300) } } : {}),
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const session = await requireUser();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = brokerProfilePatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const row = await brokerService.upsertBrokerProfile(session.user.id, parsed.data);
    return NextResponse.json({ profile: serializeProfile(row) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error";
    const status = 400;
    return NextResponse.json({ error: message }, { status });
  }
}
