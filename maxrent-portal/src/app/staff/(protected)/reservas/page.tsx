import Link from "next/link";
import { StaffAllReservations } from "@/components/staff/staff-all-reservations";

/**
 * Staff hub: unified active reservations (brokers + inversionistas).
 *
 * @route /staff/reservas
 * @domain maxrent-portal
 * @see StaffAllReservations
 */
export default function StaffReservasPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-gray-900">Reservas</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600">
          Vista consolidada de holds en inventario y reservas del portal inversionista. La misma
          tabla está en{" "}
          <Link href="/staff/properties" className="font-semibold text-blue-700 underline">
            Staff → Propiedades
          </Link>{" "}
          (pestaña Reservas).
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50/90 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">Activas</h2>
          <p className="mt-0.5 text-xs text-gray-600">
            Elegí la acción en la fila; después «Aprobar cambios» abre el aviso y «Confirmar y
            ejecutar» aplica el cambio.
          </p>
        </div>
        <div className="p-2 sm:p-4">
          <StaffAllReservations />
        </div>
      </div>
    </div>
  );
}
