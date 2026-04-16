import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

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
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/broker" className="text-lg font-bold text-gray-900">
            MaxRent - Broker
          </Link>
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
            Portal principal
          </Link>
        </div>
      </header>
      <div className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </div>
    </div>
  );
}
