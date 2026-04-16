import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BrokerPropertyDetail } from "@/components/broker/broker-property-detail";

type Props = { params: { id: string } };

export default async function BrokerPropertyPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.brokerAccessStatus !== "APPROVED") {
    redirect("/broker");
  }

  return <BrokerPropertyDetail propertyId={params.id} />;
}
