"use client";

/**
 * Broker portal navigation (fixed sidebar, mobile drawer), aligned with investor `Sidebar` UX.
 *
 * @domain maxrent-portal / broker
 * @see maxrent-portal/src/components/portal/sidebar.tsx
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Clock,
  FileText,
  LayoutDashboard,
  LogOut,
  MailPlus,
  Menu,
  Share2,
  Sparkles,
  User,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Logo } from "@/components/Logo";

export interface BrokerSidebarProps {
  brokerAccessStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
  canInvest: boolean;
}

type StatusStrip = {
  label: string;
  className: string;
  link?: { href: string; text: string };
};

function brokerStatusStrip(status: BrokerSidebarProps["brokerAccessStatus"]): StatusStrip {
  if (status === "APPROVED") {
    return {
      label: "Cuenta aprobada — tenés acceso a oportunidades e inversionistas.",
      className: "bg-emerald-50 text-emerald-900 border-emerald-200",
    };
  }
  if (status === "PENDING") {
    return {
      label: "Solicitud en revisión por el equipo MaxRent.",
      className: "bg-amber-50 text-amber-900 border-amber-200",
      link: { href: "/broker/pending", text: "Ver estado" },
    };
  }
  if (status === "REJECTED") {
    return {
      label: "La última solicitud no fue autorizada. Podés actualizar el perfil y volver a intentar.",
      className: "bg-red-50 text-red-900 border-red-200",
      link: { href: "/broker/rechazado", text: "Detalle y próximos pasos" },
    };
  }
  return {
    label: "Aún no enviaste la solicitud de acceso broker.",
    className: "bg-broker-accent-soft text-broker-navy border-indigo-200",
    link: { href: "/broker/perfil", text: "Completar perfil y pasos" },
  };
}

export function BrokerSidebar({ brokerAccessStatus, canInvest }: BrokerSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const strip = useMemo(() => brokerStatusStrip(brokerAccessStatus), [brokerAccessStatus]);

  const navItems = useMemo(() => {
    const items: { href: string; label: string; icon: typeof User }[] = [
      { href: "/broker/perfil", label: "Perfil broker", icon: User },
    ];

    if (brokerAccessStatus === null || brokerAccessStatus === "REJECTED") {
      items.push({ href: "/broker/solicitud", label: "Enviar solicitud", icon: FileText });
    }
    if (brokerAccessStatus === "PENDING") {
      items.push({ href: "/broker/pending", label: "Estado de solicitud", icon: Clock });
    }
    if (brokerAccessStatus === "REJECTED") {
      items.push({ href: "/broker/rechazado", label: "Resultado", icon: FileText });
    }
    if (brokerAccessStatus === "APPROVED") {
      items.push({
        href: "/broker/invitar",
        label: "Invitar inversionista",
        icon: MailPlus,
      });
      items.push({
        href: "/broker/oportunidades",
        label: "Oportunidades de Inversión",
        icon: Sparkles,
      });
      items.push({
        href: "/broker/inversionistas",
        label: "Inversionistas",
        icon: Users,
      });
      items.push({
        href: "/broker/referidos",
        label: "Mis referidos",
        icon: Share2,
      });
    }

    return items;
  }, [brokerAccessStatus]);

  const portalHref = canInvest ? "/dashboard" : "/";
  const portalLabel = canInvest ? "Portal inversionista" : "Inicio";

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200"
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5 text-broker-navy" />
      </button>

      {mobileOpen ? (
        <button
          type="button"
          className="lg:hidden fixed inset-0 bg-black/30 z-40 cursor-default border-0 p-0"
          aria-label="Cerrar menú"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <Link
            href="/broker"
            className="block transition-opacity hover:opacity-80"
            title="MaxRent — Portal Broker"
            onClick={() => setMobileOpen(false)}
          >
            <Logo size="sm" tone="dark" />
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 text-gray-400 hover:text-gray-600"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          className={`mx-3 mt-3 rounded-lg border px-3 py-2.5 text-xs leading-snug ${strip.className}`}
          role="status"
          aria-live="polite"
        >
          <p className="font-medium">{strip.label}</p>
          {strip.link ? (
            <Link
              href={strip.link.href}
              onClick={() => setMobileOpen(false)}
              className="mt-1 inline-block font-semibold text-broker-accent underline decoration-broker-accent/40 underline-offset-2 hover:text-broker-accent-hover"
            >
              {strip.link.text}
            </Link>
          ) : null}
        </div>

        <nav className="px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href.startsWith("/broker/") && pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-broker-accent-soft text-broker-accent"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}

          <Link
            href={portalHref}
            onClick={() => setMobileOpen(false)}
            className="mt-4 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <LayoutDashboard className="w-5 h-5 shrink-0" />
            {portalLabel}
          </Link>
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2">
            {session?.user?.image ? (
              <img src={session.user.image} alt="" className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-broker-accent-soft flex items-center justify-center">
                <span className="text-sm font-medium text-broker-accent">
                  {session?.user?.name?.[0] || session?.user?.email?.[0] || "?"}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {session?.user?.name || "Usuario"}
              </p>
              <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="mt-2 w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
