/**
 * Reservation statuses that block creating another reservation for the same property
 * and that should appear in "Mis reservas" / catalog "already reserved" UI.
 *
 * @domain portal
 * @see POST /api/reservations — duplicate check
 * @see GET /api/reservations — list filter
 */

export const INVESTOR_ACTIVE_RESERVATION_STATUSES = [
  "PENDING_PAYMENT",
  "PAYMENT_PROCESSING",
  "PAID",
  "CONFIRMED",
] as const;

export type InvestorActiveReservationStatus = (typeof INVESTOR_ACTIVE_RESERVATION_STATUSES)[number];
