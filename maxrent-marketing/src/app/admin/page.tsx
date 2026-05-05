// =============================================================================
// Admin page — gestión de allowlist (solo super-admins)
// =============================================================================
// Super-admin lee BD y muestra UI con form para agregar y botones para quitar.
// Las mutaciones van a server actions en `actions.ts`.
// =============================================================================

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { SiteHeader } from "@/components/SiteHeader";
import {
  isSuperAdmin,
  listAllowedEmails,
  superAdminEmails,
} from "@/lib/marketing-access";
import { AdminClient } from "./AdminClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Administrar accesos",
};

function formatDate(d: Date): string {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminPage() {
  const session = await auth();
  const email = session?.user?.email ?? null;

  if (!email) {
    redirect("/signin?callbackUrl=/admin");
  }
  if (!isSuperAdmin(email)) {
    redirect("/");
  }

  const allowed = await listAllowedEmails();
  const superAdmins = Array.from(superAdminEmails()).sort();

  const allowedSerialized = allowed.map((row) => ({
    id: row.id,
    email: row.email,
    addedBy: row.addedBy,
    note: row.note,
    createdAtFormatted: formatDate(row.createdAt),
  }));

  return (
    <>
      <SiteHeader />
      <main className="max-w-4xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="text-xs text-gray-3 hover:text-dark mb-6 inline-block"
        >
          ← Volver
        </Link>

        <section className="mb-10">
          <p className="text-xs uppercase tracking-widest text-orange font-semibold mb-3">
            Acceso restringido
          </p>
          <h1 className="text-4xl text-dark mb-3">Administrar accesos</h1>
          <p className="text-base text-gray-3 max-w-2xl">
            Lista de correos autorizados para entrar a marketing.maxrent.cl.
            Cambios efectivos al instante (la próxima vez que la persona inicie
            sesión).
          </p>
        </section>

        <section className="mb-10 bg-white border border-gray-1 rounded-2xl p-6">
          <p className="text-xs uppercase tracking-widest text-gray-3 font-semibold mb-3">
            Super-admins (env var <code className="font-mono">MARKETING_SUPER_ADMINS</code>)
          </p>
          <ul className="space-y-1">
            {superAdmins.map((e) => (
              <li
                key={e}
                className="flex items-center gap-2 text-sm text-dark"
              >
                <span className="font-mono">{e}</span>
                <span className="text-xs text-gray-3">· solo editable en Vercel</span>
              </li>
            ))}
          </ul>
        </section>

        <AdminClient initialList={allowedSerialized} currentAdminEmail={email} />
      </main>
    </>
  );
}
