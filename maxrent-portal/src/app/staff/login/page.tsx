import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import LoginContent from "@/app/(auth)/login/login-content";
import { StaffAccessDenied } from "./staff-access-denied";

function StaffLoginFallback() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <p className="text-sm text-gray-500">Cargando…</p>
    </main>
  );
}

function staffAuthErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  const c = code.toLowerCase();
  if (c === "accessdenied")
    return "Acceso denegado por el proveedor. Prueba otra cuenta o revisa permisos en Google Cloud.";
  if (c === "configuration")
    return "Error de configuración (NEXTAUTH_URL, AUTH_SECRET o redirect URI de Google).";
  if (c === "verification")
    return "El enlace expiró o ya se usó. Solicita un nuevo correo de acceso.";
  if (c === "forbidden")
    return "No tienes permiso para el panel staff con esta sesión.";
  return `No se pudo iniciar sesión (${code}).`;
}

type PageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function StaffLoginPage({ searchParams }: PageProps) {
  const session = await auth();
  const errRaw = searchParams.error;
  const err = typeof errRaw === "string" ? errRaw : undefined;
  const user = session?.user;

  if (user?.staffRole === "SUPER_ADMIN") {
    redirect("/staff");
  }
  if (user) {
    return (
      <StaffAccessDenied
        email={user.email}
        reason={err?.toLowerCase() === "accessdenied" ? "oauth" : "forbidden"}
      />
    );
  }

  const serverError = staffAuthErrorMessage(err);

  return (
    <Suspense fallback={<StaffLoginFallback />}>
      <LoginContent
        defaultCallbackUrl="/staff"
        heading="MaxRent - Staff"
        subtitle="Acceso interno (no compartir esta URL). Con enlace por email, abre el correo y pulsa el enlace."
        serverError={serverError}
      />
    </Suspense>
  );
}
