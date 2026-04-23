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
    <div className="max-w-xl space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="font-serif text-xl font-semibold tracking-tight text-broker-navy">
        Solicitud no autorizada
      </h1>
      <p className="text-sm leading-relaxed text-broker-muted">
        En este momento no podemos activar tu acceso al canal broker. Si crees que se
        trata de un error o quieres volver a intentarlo más adelante, contáctanos.
      </p>
      <div className="flex flex-wrap gap-4">
        <Link
          href="/broker/perfil"
          className="inline-flex text-sm font-medium text-broker-accent transition-colors hover:text-broker-accent-hover hover:underline"
        >
          Actualizar perfil comercial
        </Link>
        <Link
          href="/broker/solicitud"
          className="inline-flex text-sm font-medium text-broker-accent transition-colors hover:text-broker-accent-hover hover:underline"
        >
          Volver a enviar solicitud
        </Link>
        <Link
          href="/"
          className="inline-flex text-sm font-medium text-broker-muted transition-colors hover:text-broker-accent hover:underline"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
