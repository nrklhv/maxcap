import { Clock } from "lucide-react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BrokerOnboardingSteps } from "@/components/broker/broker-onboarding-steps";
import { BrokerPendingSessionHint } from "@/components/broker/broker-pending-session-hint";

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
    <div className="max-w-2xl space-y-6">
      <BrokerOnboardingSteps brokerAccessStatus="PENDING" profileComplete showRequirements={false} />
      <div className="max-w-xl space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full bg-broker-accent-soft text-broker-accent"
          aria-hidden
        >
          <Clock className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <h1 className="font-serif text-xl font-semibold tracking-tight text-broker-navy">
          Autorización pendiente
        </h1>
        <p className="text-sm leading-relaxed text-broker-muted">
          Recibimos tu solicitud. Cuando MaxRent valide tu cuenta, podrás acceder a las oportunidades de inversión y
          al material para asesorar a tus clientes.
        </p>
        <p className="text-xs leading-relaxed text-broker-muted/90">
          Te contactaremos por el email de tu cuenta si necesitamos más antecedentes.
        </p>
        <BrokerPendingSessionHint />
      </div>
    </div>
  );
}
