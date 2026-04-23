import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BrokerInvitarPanel } from "@/components/broker/broker-invitar-panel";

/**
 * Broker portal: invite investors via shareable link (sponsor association after claim).
 *
 * @route /broker/invitar
 * @domain maxrent-portal / broker
 */
export default async function BrokerInvitarPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/broker/invitar");

  if (session.user.brokerAccessStatus !== "APPROVED") {
    redirect("/broker");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-broker-navy">
          Invitar inversionista
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-broker-muted">
          Compartí un enlace para que una persona cree su cuenta o entre con Google: al completar el acceso
          quedará vinculada a tu corretaje como inversionista patrocinado.
        </p>
      </div>
      <BrokerInvitarPanel />
    </div>
  );
}
