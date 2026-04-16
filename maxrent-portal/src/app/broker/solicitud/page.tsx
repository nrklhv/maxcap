import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BrokerApplyForm } from "@/components/broker/broker-apply-form";

export default async function BrokerSolicitudPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/broker/solicitud");

  const { brokerAccessStatus } = session.user;

  if (brokerAccessStatus === "APPROVED") {
    redirect("/broker/oportunidades");
  }
  if (brokerAccessStatus === "PENDING") {
    redirect("/broker/pending");
  }
  if (brokerAccessStatus === "REJECTED") {
    redirect("/broker/rechazado");
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Solicitud de acceso broker</h1>
        <p className="mt-2 text-gray-600">
          Al enviar la solicitud, tu cuenta pasará a revisión por el equipo MaxRent.
          Cuando seas aprobado, podrás ver las oportunidades de inversión disponibles.
        </p>
      </div>
      <BrokerApplyForm />
    </div>
  );
}
