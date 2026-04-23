import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BrokerOpportunitiesFromApi } from "@/components/broker/broker-opportunities-from-api";

export default async function BrokerOportunidadesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.brokerAccessStatus !== "APPROVED") {
    redirect("/broker");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-broker-navy">
          Oportunidades de Inversión
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-broker-muted">
          Propiedades que el equipo publicó para brokers (mismo inventario que en Staff →
          Propiedades, filtrado por publicada y disponible).
        </p>
      </div>
      <BrokerOpportunitiesFromApi />
    </div>
  );
}
