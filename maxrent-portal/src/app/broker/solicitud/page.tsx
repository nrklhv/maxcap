import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BrokerApplyForm } from "@/components/broker/broker-apply-form";
import { BrokerOnboardingSteps } from "@/components/broker/broker-onboarding-steps";
import * as brokerService from "@/lib/services/broker.service";

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

  const profileComplete = await brokerService.userHasCompleteBrokerProfile(session.user.id);
  if (!profileComplete) {
    redirect("/broker/perfil");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <BrokerOnboardingSteps
        brokerAccessStatus={brokerAccessStatus ?? null}
        profileComplete={profileComplete}
        showRequirements
      />
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-broker-navy">
          Solicitud de acceso broker
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-broker-muted">
          Al enviar la solicitud, tu cuenta pasará a revisión por el equipo MaxRent.
          Cuando seas aprobado, podrás ver las oportunidades de inversión disponibles.
        </p>
        {brokerAccessStatus === "REJECTED" ? (
          <p className="mt-3 text-sm leading-relaxed text-amber-900 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            Tu solicitud anterior no fue aprobada. Podés actualizar tu{" "}
            <strong>Perfil comercial</strong> si hace falta y volver a enviar desde acá.
          </p>
        ) : null}
      </div>
      <BrokerApplyForm />
    </div>
  );
}
