import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BrokerSidebar } from "@/components/broker/broker-sidebar";

export const metadata: Metadata = {
  title: { absolute: "MaxRent - Broker" },
  description: "Portal de brokers MaxRent",
};

export default async function BrokerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/broker/solicitud");
  }

  return (
    <div className="flex min-h-screen bg-broker-canvas">
      <BrokerSidebar
        brokerAccessStatus={session.user.brokerAccessStatus}
        canInvest={session.user.canInvest}
      />
      <div className="flex flex-1 flex-col min-w-0">
        <header className="border-b border-gray-200 bg-white lg:hidden shrink-0">
          <div className="flex items-center justify-end gap-3 px-4 py-3 pl-14">
            <Link
              href="/"
              className="text-xs font-medium text-broker-muted transition-colors hover:text-broker-accent"
            >
              Inicio
            </Link>
          </div>
        </header>
        <main className="flex-1 min-w-0 px-4 py-6 pt-4 sm:px-6 lg:pt-8">{children}</main>
      </div>
    </div>
  );
}
