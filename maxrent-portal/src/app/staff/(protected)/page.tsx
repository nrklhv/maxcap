import Link from "next/link";
import { Building2, ClipboardList, Clock, UserRound, Users, UserCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";

const ACTIVE_INVESTOR_RESERVATION_STATUSES = [
  "PENDING_PAYMENT",
  "PAYMENT_PROCESSING",
  "PAID",
  "CONFIRMED",
] as const;

export default async function StaffHomePage() {
  const [propertyTotal, visibleToBrokers, brokerPending, brokerApproved, activeInvestorReservations] =
    await Promise.all([
      prisma.property.count(),
      prisma.property.count({ where: { visibleToBrokers: true } }),
      prisma.user.count({ where: { brokerAccessStatus: "PENDING" } }),
      prisma.user.count({ where: { brokerAccessStatus: "APPROVED" } }),
      prisma.reservation.count({
        where: { status: { in: [...ACTIVE_INVESTOR_RESERVATION_STATUSES] } },
      }),
    ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-serif tracking-tight">
          Panel interno
        </h1>
        <p className="mt-2 text-gray-600 max-w-2xl leading-relaxed">
          Gestión de inventario y aprobación de brokers. Esta URL no está enlazada desde las
          páginas públicas.
        </p>
      </div>

      <section aria-label="Resumen">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
          Resumen
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Building2 className="h-4 w-4 shrink-0" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-wide">Propiedades</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{propertyTotal}</p>
            <p className="text-xs text-gray-500 mt-0.5">{visibleToBrokers} visibles a brokers</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 shadow-sm ring-1 ring-amber-100">
            <div className="flex items-center gap-2 text-amber-800 mb-1">
              <Clock className="h-4 w-4 shrink-0" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-wide">Pendientes</span>
            </div>
            <p className="text-2xl font-bold text-amber-950 tabular-nums">{brokerPending}</p>
            <p className="text-xs text-amber-900/80 mt-0.5">Solicitudes broker</p>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50/60 px-4 py-3 shadow-sm ring-1 ring-green-100">
            <div className="flex items-center gap-2 text-green-800 mb-1">
              <UserCheck className="h-4 w-4 shrink-0" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-wide">Aprobados</span>
            </div>
            <p className="text-2xl font-bold text-green-950 tabular-nums">{brokerApproved}</p>
            <p className="text-xs text-green-900/80 mt-0.5">Cuentas broker activas</p>
          </div>
          <Link
            href="/staff/brokers"
            className="rounded-xl border border-violet-200 bg-violet-50/50 px-4 py-3 shadow-sm ring-1 ring-violet-100 flex flex-col justify-center hover:bg-violet-50 transition-colors"
          >
            <div className="flex items-center gap-2 text-violet-800 mb-1">
              <Users className="h-4 w-4 shrink-0" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-wide">Cola</span>
            </div>
            <p className="text-sm font-semibold text-violet-950">Revisar brokers →</p>
          </Link>
        </div>
      </section>

      <section aria-label="Accesos">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
          Módulos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/staff/inversionistas"
          className="group flex gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm ring-1 ring-gray-100 hover:border-blue-200 hover:ring-blue-100 hover:shadow-md transition-all"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800">
            <UserRound className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 group-hover:text-blue-800">
              Inversionistas
            </h2>
            <p className="mt-1 text-sm text-gray-500 leading-snug">
              Listado con evaluaciones Floid y habilitación de «Reservar» cuando corresponda.
            </p>
          </div>
        </Link>
        <Link
          href="/staff/reservas"
          className="group flex gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm ring-1 ring-gray-100 hover:border-blue-200 hover:ring-blue-100 hover:shadow-md transition-all"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
            <ClipboardList className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 group-hover:text-blue-800">
              Reservas activas
            </h2>
            <p className="mt-1 text-sm text-gray-500 leading-snug">
              Inversionistas y holds broker.{" "}
              <span className="font-medium text-gray-700 tabular-nums">
                {activeInvestorReservations}
              </span>{" "}
              reservas inversionista en curso.
            </p>
          </div>
        </Link>
        <Link
          href="/staff/properties"
          className="group flex gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm ring-1 ring-gray-100 hover:border-blue-200 hover:ring-blue-100 hover:shadow-md transition-all"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <Building2 className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 group-hover:text-blue-800">
              Propiedades
            </h2>
            <p className="mt-1 text-sm text-gray-500 leading-snug">
              Alta, edición y visibilidad para el canal broker.
            </p>
          </div>
        </Link>
        <Link
          href="/staff/brokers"
          className="group flex gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm ring-1 ring-gray-100 hover:border-blue-200 hover:ring-blue-100 hover:shadow-md transition-all"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
            <Users className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 group-hover:text-blue-800">
              Brokers
            </h2>
            <p className="mt-1 text-sm text-gray-500 leading-snug">
              Aprobar o rechazar solicitudes de acceso.
            </p>
          </div>
        </Link>
      </div>
      </section>
    </div>
  );
}
