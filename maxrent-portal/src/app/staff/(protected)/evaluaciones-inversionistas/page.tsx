import { redirect } from "next/navigation";

/**
 * Legacy URL: staff investor queue now lives under `/staff/inversionistas`.
 *
 * @route /staff/evaluaciones-inversionistas
 */
export default function StaffEvaluacionesInversionistasRedirectPage() {
  redirect("/staff/inversionistas");
}
