// =============================================================================
// Dashboard — Vista principal del usuario
// =============================================================================

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Obtener datos del usuario para el dashboard
  const [profile, latestEvaluation, reservations] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: session.user.id } }),
    prisma.creditEvaluation.findFirst({
      where: { userId: session.user.id },
      orderBy: { requestedAt: "desc" },
    }),
    prisma.reservation.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hola, {session.user.name?.split(" ")[0] || "ahí"} 👋
        </h1>
        <p className="mt-1 text-gray-600">
          Aquí puedes ver el estado de tu proceso de compra.
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Perfil */}
        <StatusCard
          title="Perfil"
          status={profile?.onboardingCompleted ? "completed" : "pending"}
          statusLabel={profile?.onboardingCompleted ? "Completo" : "Pendiente"}
          href="/perfil"
          description={
            profile?.onboardingCompleted
              ? `RUT: ${profile.rut}`
              : "Completa tus datos para continuar"
          }
        />

        {/* Evaluación */}
        <StatusCard
          title="Evaluación crediticia"
          status={
            !latestEvaluation
              ? "pending"
              : latestEvaluation.status === "COMPLETED"
              ? "completed"
              : latestEvaluation.status === "FAILED"
              ? "error"
              : "processing"
          }
          statusLabel={
            !latestEvaluation
              ? "No solicitada"
              : latestEvaluation.status === "COMPLETED"
              ? `Score: ${latestEvaluation.score}`
              : latestEvaluation.status === "FAILED"
              ? "Error"
              : "En proceso"
          }
          href="/evaluacion"
          description={
            !latestEvaluation
              ? "Evalúa tu capacidad de compra"
              : latestEvaluation.summary || "Ver detalles"
          }
        />

        {/* Reservas */}
        <StatusCard
          title="Reservas"
          status={reservations.length > 0 ? "completed" : "pending"}
          statusLabel={
            reservations.length > 0
              ? `${reservations.length} reserva(s)`
              : "Sin reservas"
          }
          href="/reserva"
          description={
            reservations.length > 0
              ? `Última: ${reservations[0].propertyName || reservations[0].propertyId}`
              : "Reserva tu propiedad ideal"
          }
        />
      </div>

      {/* Timeline / Próximos pasos */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Tu proceso de compra
        </h2>
        <div className="space-y-4">
          <TimelineStep
            step={1}
            title="Completa tu perfil"
            done={profile?.onboardingCompleted || false}
          />
          <TimelineStep
            step={2}
            title="Evaluación crediticia"
            done={latestEvaluation?.status === "COMPLETED"}
          />
          <TimelineStep
            step={3}
            title="Reserva tu propiedad"
            done={reservations.some((r) => r.status === "PAID" || r.status === "CONFIRMED")}
          />
        </div>
      </div>
    </div>
  );
}

// --- Componentes auxiliares ---

function StatusCard({
  title,
  status,
  statusLabel,
  href,
  description,
}: {
  title: string;
  status: "pending" | "completed" | "processing" | "error";
  statusLabel: string;
  href: string;
  description: string;
}) {
  const statusColors = {
    pending: "bg-gray-100 text-gray-600",
    completed: "bg-green-100 text-green-700",
    processing: "bg-blue-100 text-blue-700",
    error: "bg-red-100 text-red-700",
  };

  return (
    <Link
      href={href}
      className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <span
          className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusColors[status]}`}
        >
          {statusLabel}
        </span>
      </div>
      <p className="text-sm text-gray-500 line-clamp-2">{description}</p>
    </Link>
  );
}

function TimelineStep({
  step,
  title,
  done,
}: {
  step: number;
  title: string;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
          done
            ? "bg-green-100 text-green-700"
            : "bg-gray-100 text-gray-400"
        }`}
      >
        {done ? "✓" : step}
      </div>
      <span
        className={`text-sm ${
          done ? "text-gray-900 font-medium" : "text-gray-500"
        }`}
      >
        {title}
      </span>
    </div>
  );
}
