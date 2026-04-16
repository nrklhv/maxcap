// =============================================================================
// Reservas — Lista de reservas del usuario
// =============================================================================
// Por ahora muestra las reservas existentes.
// El flujo de nueva reserva se habilitará cuando integren propiedades + pagos.
// =============================================================================

"use client";

import { useState, useEffect } from "react";
import { Home, Clock, CheckCircle, CreditCard, AlertCircle } from "lucide-react";

type Reservation = {
  id: string;
  propertyId: string;
  propertyName: string | null;
  status: string;
  amount: string;
  currency: string;
  paymentMethod: string | null;
  paidAt: string | null;
  createdAt: string;
  expiresAt: string | null;
};

export default function ReservaPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/reservations");
        if (res.ok) {
          const data = await res.json();
          setReservations(data.reservations || []);
        }
      } catch {
        // Error loading
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Reservas</h1>
        <p className="mt-1 text-gray-600">
          Gestiona tus reservas de propiedades.
        </p>
      </div>

      {reservations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <Home className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900">Sin reservas aún</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            Una vez que completes tu evaluación crediticia, podrás reservar una
            propiedad directamente desde aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reservations.map((r) => (
            <ReservationCard key={r.id} reservation={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReservationCard({ reservation: r }: { reservation: Reservation }) {
  const statusConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
    PENDING_PAYMENT: { icon: CreditCard, color: "text-amber-600", label: "Pendiente de pago" },
    PAYMENT_PROCESSING: { icon: Clock, color: "text-blue-600", label: "Procesando pago" },
    PAID: { icon: CheckCircle, color: "text-green-600", label: "Pagada" },
    CONFIRMED: { icon: CheckCircle, color: "text-green-700", label: "Confirmada" },
    CANCELLED: { icon: AlertCircle, color: "text-gray-400", label: "Cancelada" },
    EXPIRED: { icon: AlertCircle, color: "text-red-500", label: "Expirada" },
  };

  const status = statusConfig[r.status] || statusConfig.PENDING_PAYMENT;
  const StatusIcon = status.icon;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Home className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {r.propertyName || `Propiedad ${r.propertyId}`}
            </p>
            <p className="text-xs text-gray-500">
              {new Date(r.createdAt).toLocaleDateString("es-CL")}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm font-bold text-gray-900">
            ${Number(r.amount).toLocaleString("es-CL")} {r.currency}
          </p>
          <div className={`flex items-center gap-1 text-xs ${status.color}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {status.label}
          </div>
        </div>
      </div>

      {/* Botón de pago si está pendiente */}
      {r.status === "PENDING_PAYMENT" && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={() => {
              // TODO: Integrar con pasarela de pago
              alert("Integración de pago próximamente");
            }}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Pagar reserva
          </button>
        </div>
      )}
    </div>
  );
}
