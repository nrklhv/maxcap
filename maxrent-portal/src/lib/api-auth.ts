import { auth } from "@/lib/auth";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session;
}

/** Panel interno MaxRent (`/staff/*`) — solo SUPER_ADMIN */
export async function requireStaffSuperAdmin() {
  const session = await requireUser();
  if (!session || session.user.staffRole !== "SUPER_ADMIN") return null;
  return session;
}

/** Listado de oportunidades broker — requiere aprobación */
export async function requireApprovedBroker() {
  const session = await requireUser();
  if (!session) return null;
  if (session.user.brokerAccessStatus !== "APPROVED") {
    return null;
  }
  return session;
}

/** Rutas inversionista (`canInvest`) — claim de invitación broker, etc. */
export async function requireCanInvestUser() {
  const session = await requireUser();
  if (!session) return null;
  if (!session.user.canInvest) return null;
  return session;
}
