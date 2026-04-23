import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffSuperAdmin } from "@/lib/api-auth";
import * as propertyService from "@/lib/services/property.service";

const bodySchema = z.object({
  reason: z.string().max(2000).optional(),
});

/**
 * Rejects a pending catalog draft (audit trail kept; next sync/import can reopen as PENDING).
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireStaffSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const userId = session.user.id;
  if (!userId) {
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }

  const { id } = params;

  let reason: string | undefined;
  try {
    const text = await req.text();
    if (text?.trim()) {
      const parsed = bodySchema.safeParse(JSON.parse(text) as unknown);
      if (!parsed.success) {
        return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
      }
      reason = parsed.data.reason;
    }
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }

  try {
    const draft = await propertyService.rejectPropertyCatalogDraft(id, userId, reason);
    return NextResponse.json({ ok: true, draft });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al rechazar";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
