import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BrokerPropertyList } from "@/components/broker/broker-property-list";

export default async function BrokerOportunidadesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.brokerAccessStatus !== "APPROVED") {
    redirect("/broker");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Oportunidades</h1>
        <p className="mt-1 text-gray-600">
          Propiedades disponibles para ofrecer a tus clientes.
        </p>
      </div>
      <BrokerPropertyList />
    </div>
  );
}
