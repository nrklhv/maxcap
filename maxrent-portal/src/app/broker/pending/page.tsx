import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function BrokerPendingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.brokerAccessStatus === "APPROVED") {
    redirect("/broker/oportunidades");
  }
  if (session.user.brokerAccessStatus === "REJECTED") {
    redirect("/broker/rechazado");
  }
  if (session.user.brokerAccessStatus !== "PENDING") {
    redirect("/broker/solicitud");
  }

  return (
    <div className="max-w-xl space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-6">
      <h1 className="text-xl font-bold text-amber-950">Autorización pendiente</h1>
      <p className="text-amber-900 leading-relaxed">
        Recibimos tu solicitud. Cuando MaxRent valide tu cuenta, podrás acceder a las
        oportunidades de inversión y al material para asesorar a tus clientes.
      </p>
      <p className="text-sm text-amber-800">
        Te contactaremos por el email de tu cuenta si necesitamos más antecedentes.
      </p>
    </div>
  );
}
