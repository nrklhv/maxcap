"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { Logo } from "./Logo";
import { getPortalUrl } from "@/lib/site";
import { scrollToForm } from "@/lib/scrollToForm";

export type HeaderVariant = "inversionista" | "vendedor" | "broker";

export function Header({ variant }: { variant: HeaderVariant }) {
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
  const loginHref = `${getPortalUrl()}/login`;
  const loginLinkClass =
    variant === "vendedor"
      ? "border-b-2 border-transparent px-3.5 py-0 text-xs font-medium text-gray-2 transition-colors h-14 flex items-center hover:text-white hover:border-teal-2"
      : "border-b-2 border-transparent px-3.5 py-0 text-xs font-medium text-gray-2 transition-colors h-14 flex items-center hover:text-white hover:border-orange";

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
        <Link
          href="/brokers"
          className="border-b-2 border-transparent px-3.5 py-0 text-xs font-medium text-gray-2 transition-colors h-14 flex items-center hover:text-white hover:border-orange"
          onClick={() => setOpen(false)}
        >
          Soy broker
        </Link>
        <Link
          href={loginHref}
          className={loginLinkClass}
          onClick={() => setOpen(false)}
        >
          Iniciar sesión
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
        <Link
          href="/"
          className="border-b-2 border-transparent px-3.5 py-0 text-xs font-medium text-orange transition-colors h-14 flex items-center hover:text-orange-2 hover:border-teal-2 !text-orange !font-semibold"
          onClick={() => setOpen(false)}
        >
          Quiero invertir
        </Link>
        <Link
          href={loginHref}
          className={loginLinkClass}
          onClick={() => setOpen(false)}
        >
          Iniciar sesión
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
      <Link
        href="/"
        className="border-b-2 border-transparent px-3.5 py-0 text-xs font-medium text-gray-2 transition-colors h-14 flex items-center hover:text-white hover:border-orange"
        onClick={() => setOpen(false)}
      >
        Soy inversionista
      </Link>
      <Link
        href={loginHref}
        className={loginLinkClass}
        onClick={() => setOpen(false)}
      >
        Iniciar sesión
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

  const logoHref =
    variant === "inversionista" ? "/#top" : variant === "broker" ? "/brokers" : "/vendedor";

  return (
    <>
      <header className="sticky top-0 z-[100] flex h-14 items-center justify-between border-b border-white/10 bg-dark/95 px-4 backdrop-blur-md md:px-10">
        <Link href={logoHref} className="opacity-85 transition-opacity hover:opacity-100">
          <Logo size="sm" />
        </Link>
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
