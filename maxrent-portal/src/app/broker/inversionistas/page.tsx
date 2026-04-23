import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BrokerSponsoredInvestorsPanel } from "@/components/broker/broker-sponsored-investors-panel";

/**
 * Broker portal: investors linked to this broker + their reservations (sponsored relationship).
 *
 * @domain maxrent-portal / broker
 * @see GET /api/broker/sponsored-investors
 * @see GET /api/broker/sponsored-reservations
 */
export default async function BrokerInversionistasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/broker/inversionistas");

  if (session.user.brokerAccessStatus !== "APPROVED") {
    redirect("/broker");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-broker-navy">
          Inversionistas
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-broker-muted">
          Cuentas inversionistas que el equipo (staff) o tus enlaces en{" "}
          <strong>Invitar inversionista</strong> asociaron a tu corretaje. Podés ver sus{" "}
          <strong>reservas activas</strong> en el portal (mismos estados que en el catálogo inversionista).
        </p>
      </div>
      <BrokerSponsoredInvestorsPanel />
    </div>
  );
}
