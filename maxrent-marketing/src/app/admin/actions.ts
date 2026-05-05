// =============================================================================
// Server actions para administrar la allowlist (`/admin`)
// =============================================================================

"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  addAllowedEmail,
  isSuperAdmin,
  removeAllowedEmail,
} from "@/lib/marketing-access";

async function requireSuperAdmin(): Promise<string> {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!email || !isSuperAdmin(email)) {
    throw new Error("Forbidden — solo super-admins pueden gestionar accesos.");
  }
  return email;
}

export async function addEmailAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const adminEmail = await requireSuperAdmin();
    const raw = String(formData.get("email") ?? "").trim().toLowerCase();
    if (!raw) return { ok: false, error: "Ingresa un correo." };
    if (!raw.includes("@") || raw.length > 200) {
      return { ok: false, error: "Correo inválido." };
    }
    const note = String(formData.get("note") ?? "").trim() || null;
    if (isSuperAdmin(raw)) {
      return {
        ok: false,
        error: "Ese correo ya es super-admin (env var). No hace falta agregarlo a la lista.",
      };
    }
    await addAllowedEmail(raw, { addedBy: adminEmail, note });
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido.";
    return { ok: false, error: message };
  }
}

export async function removeEmailAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireSuperAdmin();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    if (!email) return { ok: false, error: "Correo requerido." };
    await removeAllowedEmail(email);
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido.";
    return { ok: false, error: message };
  }
}
