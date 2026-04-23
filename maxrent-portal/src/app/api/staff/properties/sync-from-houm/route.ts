import { NextResponse } from "next/server";
import { requireStaffSuperAdmin } from "@/lib/api-auth";
import { isM2mConfigured } from "@/lib/houm/m2m-token";
import {
  HoumByIdPathMissingError,
  syncPropertiesFromHoum,
} from "@/lib/houm/sync-from-houm";
import { syncFromHoumRequestSchema } from "@/lib/houm/sync-from-houm-request";

/**
 * Staff sync from Houm (M2M). Body JSON opcional:
 * `{ "mode": "list"|"byIds", "listQuery": { "limit": "100" }, "houmIds": ["a","b"] }`
 * Body vacío = listado sin query (comportamiento anterior).
 */
export async function POST(req: Request) {
  const session = await requireStaffSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!process.env.HOUM_API_BASE_URL?.trim()) {
    return NextResponse.json(
      { error: "HOUM_API_BASE_URL no configurada" },
      { status: 503 }
    );
  }

  if (!isM2mConfigured()) {
    return NextResponse.json(
      {
        error:
          "M2M no configurado: defina AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_API_AUDIENCE",
      },
      { status: 503 }
    );
  }

  let body: unknown = {};
  try {
    const text = await req.text();
    if (text?.trim()) {
      body = JSON.parse(text) as unknown;
    }
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }

  const parsed = syncFromHoumRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parámetros inválidos", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const result = await syncPropertiesFromHoum(parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof HoumByIdPathMissingError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 501 });
    }
    const message = e instanceof Error ? e.message : "Error al sincronizar";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
