"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Building2, ClipboardList, Home, LayoutDashboard, LogOut, UserRound, Users } from "lucide-react";

const links = [
  { href: "/staff", label: "Inicio", icon: Home, match: (p: string) => p === "/staff" },
  {
    href: "/staff/inversionistas",
    label: "Inversionistas",
    icon: UserRound,
    match: (p: string) =>
      p.startsWith("/staff/inversionistas") || p.startsWith("/staff/evaluaciones-inversionistas"),
  },
  {
    href: "/staff/properties",
    label: "Propiedades",
    icon: Building2,
    match: (p: string) => p.startsWith("/staff/properties"),
  },
  {
    href: "/staff/reservas",
    label: "Reservas",
    icon: ClipboardList,
    match: (p: string) => p.startsWith("/staff/reservas"),
  },
  {
    href: "/staff/brokers",
    label: "Brokers",
    icon: Users,
    match: (p: string) => p.startsWith("/staff/brokers"),
  },
] as const;

export function StaffNav() {
  const pathname = usePathname() || "";

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xl font-bold text-gray-900 font-serif tracking-tight">
            MaxRent - Staff
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Panel interno
          </span>
        </div>

        <nav className="flex flex-wrap items-center gap-1">
          {links.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden />
                {label}
              </Link>
            );
          })}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 border border-transparent hover:border-blue-100"
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" aria-hidden />
            Portal inversionista
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 self-start sm:self-auto"
        >
          <LogOut className="w-4 h-4 shrink-0" aria-hidden />
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
