import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BrokerPerfilTwoColumn } from "@/components/broker/broker-perfil-two-column";
import * as brokerService from "@/lib/services/broker.service";

export default async function BrokerPerfilPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/broker/perfil");

  const profileComplete = await brokerService.userHasCompleteBrokerProfile(session.user.id);

  const personalProfile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: {
      firstName: true,
      lastName: true,
      contactEmail: true,
      rut: true,
      phone: true,
      address: true,
      commune: true,
      city: true,
    },
  });

  return (
    <BrokerPerfilTwoColumn
      account={{
        email: session.user.email ?? "",
        name: session.user.name ?? null,
        image: session.user.image ?? null,
      }}
      personalProfile={personalProfile}
      canInvest={session.user.canInvest}
      brokerAccessStatus={session.user.brokerAccessStatus ?? null}
      profileComplete={profileComplete}
    />
  );
}
