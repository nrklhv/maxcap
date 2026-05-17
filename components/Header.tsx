"use client";

import Link from "next/link";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { Logo } from "./Logo";
import { getPortalUrl } from "@/lib/site";
import { scrollToForm } from "@/lib/scrollToForm";
import { referralQueryParam } from "@/lib/referralCookie";

export type HeaderVariant = "inversionista" | "vendedor" | "broker";

export function Header({
  variant,
  ufBadge,
}: {
  variant: HeaderVariant;
  /**
   * Slot opcional para un Server Component renderizado (típicamente `<UfBadge />`)
   * que aparece entre el logo y el nav. Aceptamos un `ReactNode` pre-renderizado
   * para evitar fetching client-side (cache HTTP de Next desde el server-side).
   */
  ufBadge?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // Si el CTA apunta a `#form` de la página actual y el form sticky ya está
  // visible, el navegador no produce feedback al click. Interceptamos para
  // hacer scroll, focus al primer input y mostrar un pulso visual.
  function handleFormCtaClick(e: MouseEvent<HTMLAnchorElement>) {
    const href = e.currentTarget.getAttribute("href") ?? "";
    if (href.includes("#form")) {
      try {
        const url = new URL(href, window.location.href);
        if (url.pathname === window.location.pathname) {
          e.preventDefault();
          scrollToForm();
        }
      } catch {
        // Href inválido — dejamos comportamiento por defecto.
      }
    }
    setOpen(false);
  }
  const ctaClass =
    variant === "vendedor"
      ? "bg-teal text-white hover:bg-[#085041]"
      : "bg-orange text-white hover:bg-[#E55A00]";

  // Dos puertas explícitas al portal — solucionan el caso multi-rol donde
  // un mismo email tiene cuenta inversionista y broker. El callbackUrl
  // garantiza que cada link aterrice en su área.
  //
  // Si hay cookie `mxr_ref` (referido), anexamos `&ref=INV-XXX` al href para
  // que el portal capture la atribución incluso si la cookie cross-subdomain
  // no viaja (browsers strictos, private mode). El portal tiene un middleware
  // que persiste el `?ref=` en su propia cookie del dominio del portal y el
  // event `createUser` de NextAuth lo lee al crear la cuenta.
  const portalUrl = getPortalUrl();
  const [refParam, setRefParam] = useState<string | null>(null);
  useEffect(() => {
    // referralQueryParam() usa document.cookie → solo cliente. Por eso
    // useEffect (no se evalúa en SSR).
    setRefParam(referralQueryParam());
  }, []);
  const refSuffix = refParam ? `&${refParam}` : "";
  const investorPortalHref = `${portalUrl}/login?callbackUrl=/dashboard${refSuffix}`;
  const brokerPortalHref = `${portalUrl}/login?callbackUrl=/broker/oportunidades${refSuffix}`;

  // Nav links "comunes" (navegación dentro de la propia landing) tienen sus
  // clases hardcodeadas inline en cada `<Link>` más abajo — gris neutro,
  // hover blanco con border-bottom del accent. No las extraemos a una const
  // porque el JSX las repite con cada item del nav (legible directo).
  //
  // Cross-section links a OTRAS landings públicas ("Brokers aliados", "Club
  // inversionista"): gris neutro como el resto del nav. Son navegación entre
  // landings, no acciones de "entrar al portal".
  const crossLinkClass =
    variant === "vendedor"
      ? "border-b-2 border-transparent px-3.5 py-0 text-xs font-medium text-gray-2 transition-colors h-14 flex items-center hover:text-white hover:border-teal-2"
      : "border-b-2 border-transparent px-3.5 py-0 text-xs font-medium text-gray-2 transition-colors h-14 flex items-center hover:text-white hover:border-orange";

  // Links al **portal** autenticado ("Portal inversionista", "Portal broker"):
  // pintados con el accent del variant para diferenciarlos del resto del nav y
  // comunicar claramente "esto te lleva al login / la app del portal".
  const portalLinkClass =
    variant === "vendedor"
      ? "border-b-2 border-transparent px-3.5 py-0 text-xs font-medium text-teal-2 transition-colors h-14 flex items-center hover:text-white hover:border-teal-2"
      : "border-b-2 border-transparent px-3.5 py-0 text-xs font-medium text-orange-2 transition-colors h-14 flex items-center hover:text-white hover:border-orange";

  // "Brokers aliados" → link al landing `/brokers` (no al portal). Distinto de
  // "Portal broker" que es el login para brokers ya aprobados. Aparece en
  // variants `inversionista` y `vendedor`; en `broker` no agrega valor (ya estás
  // en esa página).
  const brokersAliadosLink = (
    <Link
      href="/brokers"
      className={crossLinkClass}
      onClick={() => setOpen(false)}
    >
      Brokers aliados
    </Link>
  );

  const links =
    variant === "inversionista" ? (
      <>
        <Link
          href="/#pilares"
          className="border-b-2 border-transparent px-3.5 py-0 text-xs font-medium text-gray-2 transition-colors h-14 flex items-center text-gray-2 hover:text-white hover:border-orange"
          onClick={() => setOpen(false)}
        >
          El Club
        </Link>
        <Link
          href="/#como"
          className="border-b-2 border-transparent px-3.5 py-0 text-xs font-medium text-gray-2 transition-colors h-14 flex items-center hover:text-white hover:border-orange"
          onClick={() => setOpen(false)}
        >
          Cómo funciona
        </Link>
        <Link
          href="/#faq"
          className="border-b-2 border-transparent px-3.5 py-0 text-xs font-medium text-gray-2 transition-colors h-14 flex items-center hover:text-white hover:border-orange"
          onClick={() => setOpen(false)}
        >
          FAQ
        </Link>
        {brokersAliadosLink}
        <Link
          href={investorPortalHref}
          className={portalLinkClass}
          onClick={() => setOpen(false)}
        >
          Portal inversionista
        </Link>
        <Link
          href={brokerPortalHref}
          className={portalLinkClass}
          onClick={() => setOpen(false)}
        >
          Portal broker
        </Link>
        <Link
          href="/#form"
          className={`ml-1 rounded-lg px-[18px] py-2 text-xs font-semibold border-b-0 h-auto ${ctaClass}`}
          onClick={handleFormCtaClick}
        >
          Inscribirme
        </Link>
      </>
    ) : (
      <>
        <Link
          href="/vendedor#requisitos"
          className="border-b-2 border-transparent px-3.5 py-0 text-xs font-medium text-gray-2 transition-colors h-14 flex items-center hover:text-white hover:border-teal-2"
          onClick={() => setOpen(false)}
        >
          Requisitos
        </Link>
        <Link
          href="/vendedor#calculadora"
          className="border-b-2 border-transparent px-3.5 py-0 text-xs font-medium text-gray-2 transition-colors h-14 flex items-center hover:text-white hover:border-teal-2"
          onClick={() => setOpen(false)}
        >
          Calcula el precio de venta
        </Link>
        <Link
          href="/vendedor#faq"
          className="border-b-2 border-transparent px-3.5 py-0 text-xs font-medium text-gray-2 transition-colors h-14 flex items-center hover:text-white hover:border-teal-2"
          onClick={() => setOpen(false)}
        >
          Preguntas
        </Link>
        {brokersAliadosLink}
        <Link
          href={investorPortalHref}
          className={portalLinkClass}
          onClick={() => setOpen(false)}
        >
          Portal inversionista
        </Link>
        <Link
          href={brokerPortalHref}
          className={portalLinkClass}
          onClick={() => setOpen(false)}
        >
          Portal broker
        </Link>
        <Link
          href="/vendedor#form"
          className={`ml-1 rounded-lg px-[18px] py-2 text-xs font-semibold border-b-0 h-auto ${ctaClass}`}
          onClick={handleFormCtaClick}
        >
          Inscribirme
        </Link>
      </>
    );

  const linksBroker = (
    <>
      <Link
        href="/brokers#programa"
        className="border-b-2 border-transparent px-3.5 py-0 text-xs font-medium text-gray-2 transition-colors h-14 flex items-center hover:text-white hover:border-orange"
        onClick={() => setOpen(false)}
      >
        Programa
      </Link>
      <Link
        href="/brokers#como"
        className="border-b-2 border-transparent px-3.5 py-0 text-xs font-medium text-gray-2 transition-colors h-14 flex items-center hover:text-white hover:border-orange"
        onClick={() => setOpen(false)}
      >
        Cómo funciona
      </Link>
      <Link
        href="/brokers#faq"
        className="border-b-2 border-transparent px-3.5 py-0 text-xs font-medium text-gray-2 transition-colors h-14 flex items-center hover:text-white hover:border-orange"
        onClick={() => setOpen(false)}
      >
        FAQ
      </Link>
      {/* Volver al landing inversionista (el eje del Club). Antes solo se
          podía via el logo MAXRENT; agregamos un link explícito porque el logo
          no comunica claramente "ir al sitio inversionista". */}
      <Link
        href="/"
        className={crossLinkClass}
        onClick={() => setOpen(false)}
      >
        Club inversionista
      </Link>
      <Link
        href={investorPortalHref}
        className={portalLinkClass}
        onClick={() => setOpen(false)}
      >
        Portal inversionista
      </Link>
      <Link
        href={brokerPortalHref}
        className={portalLinkClass}
        onClick={() => setOpen(false)}
      >
        Portal broker
      </Link>
      <Link
        href="/brokers#form"
        className={`ml-1 rounded-lg px-[18px] py-2 text-xs font-semibold border-b-0 h-auto ${ctaClass}`}
        onClick={handleFormCtaClick}
      >
        Postular
      </Link>
    </>
  );

  const navLinks =
    variant === "broker" ? linksBroker : links;

  // El logo siempre vuelve a la home (`/` = landing inversionista, eje del Club).
  // Anteriormente cada variant llevaba a su propia página, pero eso confundía:
  // un visitante en /vendedor o /brokers haciendo click en MAXRENT esperaba
  // ir al sitio principal, no quedarse en la misma página.
  const logoHref = "/";

  return (
    <>
      <header className="sticky top-0 z-[100] flex h-14 items-center justify-between border-b border-white/10 bg-dark/95 px-4 backdrop-blur-md md:px-10">
        <div className="flex items-center gap-3 md:gap-5">
          <Link href={logoHref} className="opacity-85 transition-opacity hover:opacity-100">
            <Logo size="sm" />
          </Link>
          {ufBadge}
        </div>
        <nav className="hidden items-center gap-0 md:flex">{navLinks}</nav>
        <button
          type="button"
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-md border border-white/15 text-white md:hidden"
          aria-expanded={open}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen((o) => !o)}
        >
          <span
            className={`block h-0.5 w-5 bg-white transition-transform ${open ? "translate-y-2 rotate-45" : ""}`}
          />
          <span className={`block h-0.5 w-5 bg-white transition-opacity ${open ? "opacity-0" : ""}`} />
          <span
            className={`block h-0.5 w-5 bg-white transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`}
          />
        </button>
      </header>
      {open && (
        <div
          className="fixed inset-0 z-[99] flex flex-col bg-dark/95 pt-16 md:hidden"
          role="dialog"
          aria-modal="true"
        >
          <nav className="flex flex-col gap-1 px-6 py-6">{navLinks}</nav>
        </div>
      )}
    </>
  );
}
