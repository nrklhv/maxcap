// =============================================================================
// Portal Layout — Sidebar + contenido principal
// =============================================================================
// Todas las páginas bajo /(portal)/ usan este layout.
// El middleware ya se encarga de proteger estas rutas.
// =============================================================================

import type { Metadata } from "next";
import { Sidebar } from "@/components/portal/sidebar";

export const metadata: Metadata = {
  title: { absolute: "MaxRent - Inversionista" },
  description: "Portal de inversionistas MaxRent",
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 lg:ml-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
