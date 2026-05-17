/**
 * `/dashboard` quedó deprecada en el redesign del 2026-05-17 — el término no
 * era claro para inversionistas y la página solo duplicaba el journey strip
 * que ya está en `app/(portal)/layout.tsx`. La pestaña se quitó del sidebar.
 *
 * Mantenemos la ruta como redirect a `/oportunidades` por compatibilidad con
 * bookmarks viejos y links externos que pudieron haberse compartido.
 */

import { redirect } from "next/navigation";

export default function DashboardPage() {
  redirect("/oportunidades");
}
