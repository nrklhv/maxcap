/**
 * Helpers de configuración del Floid Widget.
 *
 * El widget productivo se crea en `admin.floid.app` y queda con una URL del tipo
 * `https://admin.floid.app/<merchant>/widget/<widget_id>`. Esa URL se configura
 * vía env y desde el frontend abrimos el widget agregando `?id=<RUT>&custom=<evalId>`.
 *
 * Floid devuelve el reporte por POST al webhook configurado en el widget.
 *
 * @domain creditEvaluation
 */

import { normalizeRutForFloid } from "@/lib/services/floid.service";

/**
 * Construye la URL del widget Floid con los parámetros de la sesión actual.
 *
 * @param rut RUT del inversionista (con o sin puntos; se normaliza).
 * @param evaluationId Id de `CreditEvaluation` — vuelve a nosotros como `custom` en el callback.
 * @returns URL absoluta lista para abrir en popup o redirect.
 * @throws si `FLOID_WIDGET_URL` no está configurado.
 */
export function buildFloidWidgetUrl(rut: string, evaluationId: string): string {
  const base = process.env.FLOID_WIDGET_URL?.trim();
  if (!base) {
    throw new Error(
      "FLOID_WIDGET_URL no está configurado. Setealo en .env.local con la URL del widget de admin.floid.app/<merchant>/widget/<id>."
    );
  }
  const url = new URL(base);
  url.searchParams.set("id", normalizeRutForFloid(rut));
  url.searchParams.set("custom", evaluationId);
  return url.toString();
}

/**
 * True si la integración Floid está configurada para usar el widget productivo.
 * Si false, el portal cae al modo stub (sin llamar a Floid).
 */
export function isFloidWidgetEnabled(): boolean {
  if (process.env.FLOID_USE_STUB === "true") return false;
  return Boolean(process.env.FLOID_WIDGET_URL?.trim());
}
