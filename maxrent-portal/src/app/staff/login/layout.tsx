import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "MaxRent - Staff" },
  description: "Acceso interno MaxRent (staff)",
};

export default function StaffLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
