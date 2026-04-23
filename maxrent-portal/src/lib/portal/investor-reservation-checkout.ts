/**
 * After creating a `Reservation`, starts payment checkout and redirects the browser.
 *
 * @domain portal
 * @see POST /api/payments/checkout
 */

export type CheckoutRedirectResult =
  | { ok: true }
  | { ok: false; error: string };

export async function redirectToReservationCheckout(
  reservationId: string
): Promise<CheckoutRedirectResult> {
  const res = await fetch("/api/payments/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reservationId }),
  });
  const data = (await res.json()) as { error?: string; checkoutUrl?: string };
  if (!res.ok) {
    return { ok: false, error: data.error || "No se pudo iniciar el pago" };
  }
  if (!data.checkoutUrl) {
    return { ok: false, error: "La pasarela no devolvió URL de pago" };
  }
  window.location.assign(data.checkoutUrl);
  return { ok: true };
}
