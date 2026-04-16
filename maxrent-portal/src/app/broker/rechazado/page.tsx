import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function BrokerRechazadoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.brokerAccessStatus === "APPROVED") {
    redirect("/broker/oportunidades");
  }
  if (session.user.brokerAccessStatus === "PENDING") {
    redirect("/broker/pending");
  }
  if (session.user.brokerAccessStatus !== "REJECTED") {
    redirect("/broker/solicitud");
  }

  return (
    <div className="max-w-xl space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold text-gray-900">Solicitud no autorizada</h1>
      <p className="text-gray-600 leading-relaxed">
        En este momento no podemos activar tu acceso al canal broker. Si crees que se
        trata de un error o quieres volver a intentarlo más adelante, contáctanos.
      </p>
      <Link
        href="/"
        className="inline-flex text-sm font-medium text-blue-600 hover:underline"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
