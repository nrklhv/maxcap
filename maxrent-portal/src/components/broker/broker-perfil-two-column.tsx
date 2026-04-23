/**
 * Broker `/broker/perfil` layout: personal Profile panel (left) and commercial profile form (right).
 *
 * @domain maxrent-portal / broker
 * @see BrokerPersonalPanel — PUT /api/users/profile
 * @see BrokerProfileForm — commercial PATCH flow
 */

import { BrokerOnboardingSteps } from "@/components/broker/broker-onboarding-steps";
import { BrokerPersonalPanel } from "@/components/broker/broker-personal-panel";
import { BrokerProfileForm } from "@/components/broker/broker-profile-form";
import type { BrokerPerfilAccountProps, BrokerPerfilPersonalProfile } from "@/components/broker/broker-perfil-types";
import type { BrokerAccessStatusProp } from "@/components/broker/broker-onboarding-steps";

export type { BrokerPerfilAccountProps, BrokerPerfilPersonalProfile } from "@/components/broker/broker-perfil-types";

export function BrokerPerfilTwoColumn({
  account,
  personalProfile,
  canInvest,
  brokerAccessStatus,
  profileComplete,
}: {
  account: BrokerPerfilAccountProps;
  personalProfile: BrokerPerfilPersonalProfile;
  canInvest: boolean;
  brokerAccessStatus: BrokerAccessStatusProp;
  profileComplete: boolean;
}) {
  const showReq = brokerAccessStatus !== "APPROVED";

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-broker-navy">
          Mi perfil broker
        </h1>
        <p className="mt-1 text-sm text-broker-muted">
          A la izquierda: datos personales compartidos con el perfil inversionista (una sola ficha; podés editarlos
          desde acá o desde el portal inversionista). A la derecha: datos comerciales exclusivos del canal broker.
        </p>
      </div>

      <BrokerOnboardingSteps
        brokerAccessStatus={brokerAccessStatus}
        profileComplete={profileComplete}
        showRequirements={showReq}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
        <section className="space-y-3" aria-labelledby="broker-account-heading">
          <h2
            id="broker-account-heading"
            className="text-sm font-semibold text-gray-900 uppercase tracking-wide"
          >
            Datos de la cuenta
          </h2>
          <BrokerPersonalPanel account={account} personalProfile={personalProfile} canInvest={canInvest} />
        </section>

        <section className="space-y-3" aria-labelledby="broker-commercial-heading">
          <h2
            id="broker-commercial-heading"
            className="text-sm font-semibold text-gray-900 uppercase tracking-wide"
          >
            Datos comerciales
          </h2>
          <p className="text-xs text-gray-500">
            Información de empresa y contacto comercial que usa el equipo MaxRent para evaluar tu postulación.
          </p>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <BrokerProfileForm />
          </div>
        </section>
      </div>
    </div>
  );
}
