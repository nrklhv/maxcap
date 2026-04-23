import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function BrokerHomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/broker");

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
  redirect("/broker/perfil");
}
