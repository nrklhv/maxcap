import type { Metadata } from "next";
import { StaffNav } from "@/components/staff/staff-nav";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: { absolute: "MaxRent - Staff" },
  description: "Panel interno MaxRent",
};

export default async function StaffProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || session.user.staffRole !== "SUPER_ADMIN") {
    redirect("/staff/login?error=forbidden");
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <StaffNav />
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 sm:p-8 min-h-[50vh]">
          {children}
        </div>
      </div>
    </div>
  );
}
