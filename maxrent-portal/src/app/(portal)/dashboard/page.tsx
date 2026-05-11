// =============================================================================
// Dashboard — Vista principal del usuario
// =============================================================================

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isInvestorPerfilCompleteForPortal } from "@/lib/portal/profile-labor";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Obtener datos del usuario para el dashboard
  // (Referidos viven en /referidos como página propia.)
  const [profile, latestEvaluation, reservations] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: {
        onboardingCompleted: true,
        additionalData: true,
        rut: true,
      },
    }),
    prisma.creditEvaluation.findFirst({
      where: { userId: session.user.id },
      orderBy: { requestedAt: "desc" },
    }),
    prisma.reservation.findMany({
      where: { userId: session.user.id, status: { in: ["PAID", "CONFIRMED"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const perfilListo = isInvestorPerfilCompleteForPortal(profile);

  // El stepper + next-action card ya viene del layout `/(portal)/layout.tsx`
  // (componente InvestorJourneyStrip). Acá solo agregamos contenido específico
  // del dashboard: saludo y atajos contextuales.
  const firstName = session.user.name?.split(" ")[0] || "ahí";

  return (
    <div className="space-y-8">
      {/* Saludo */}
      <div>
        <h1 className="font-serif text-2xl tracking-tight text-dark">
          Hola, {firstName} 👋
        </h1>
        <p className="mt-1 text-gray-600 text-sm">
          Tu proceso de compra en MaxRent.
        </p>
      </div>

      {/* Resumen condensado del estado actual */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatusBadge
          title="Perfil"
          state={perfilListo ? "done" : "todo"}
          detail={
            perfilListo
              ? profile?.rut
                ? `RUT ${profile.rut}`
                : "Completo"
              : "Pendiente"
          }
          href="/perfil"
        />
        <StatusBadge
          title="Evaluación"
          state={evaluationBadgeState(latestEvaluation)}
          detail={evaluationBadgeDetail(latestEvaluation)}
          href="/evaluacion"
        />
        <StatusBadge
          title="Reservas"
          state={reservations.length > 0 ? "done" : "todo"}
          detail={
            reservations.length > 0
              ? `${reservations.length} activa${reservations.length > 1 ? "s" : ""}`
              : "Sin reservas"
          }
          href="/oportunidades"
        />
      </div>
    </div>
  );
}

// ─── Helpers de estado para los badges ─────────────────────────────────────

type BadgeState = "done" | "todo" | "active" | "warn";

function evaluationBadgeState(
  evaluation: { status: string; staffReservationApprovedAt: Date | null } | null
): BadgeState {
  if (!evaluation) return "todo";
  if (evaluation.status === "FAILED" || evaluation.status === "EXPIRED") return "warn";
  if (evaluation.status === "PENDING" || evaluation.status === "PROCESSING") return "active";
  if (evaluation.status === "COMPLETED") {
    return evaluation.staffReservationApprovedAt ? "done" : "active";
  }
  return "todo";
}

function evaluationBadgeDetail(
  evaluation: { status: string; staffReservationApprovedAt: Date | null } | null
): string {
  if (!evaluation) return "No solicitada";
  if (evaluation.status === "FAILED") return "Reintentar";
  if (evaluation.status === "EXPIRED") return "Expiró";
  if (evaluation.status === "PENDING" || evaluation.status === "PROCESSING") return "En proceso";
  if (evaluation.status === "COMPLETED") {
    return evaluation.staffReservationApprovedAt
      ? "Habilitada"
      : "En revisión";
  }
  return "—";
}

// --- Componentes auxiliares ---

/**
 * Badge compacto con título, estado y un detalle corto.
 * No duplica el stepper del layout — solo da acceso rápido a cada sección.
 */
function StatusBadge({
  title,
  state,
  detail,
  href,
}: {
  title: string;
  state: BadgeState;
  detail: string;
  href: string;
}) {
  const stateColors: Record<BadgeState, { dot: string; label: string }> = {
    todo: { dot: "bg-gray-300", label: "text-gray-600" },
    active: { dot: "bg-amber-400", label: "text-amber-700" },
    done: { dot: "bg-emerald-500", label: "text-emerald-700" },
    warn: { dot: "bg-red-400", label: "text-red-700" },
  };
  const colors = stateColors[state];

  return (
    <Link
      href={href}
      className="block bg-white rounded-xl border border-gray-200 px-4 py-3 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {title}
        </h3>
        <span className={`flex h-2 w-2 rounded-full ${colors.dot}`} aria-hidden />
      </div>
      <p className={`text-sm font-medium ${colors.label} truncate`}>{detail}</p>
    </Link>
  );
}
