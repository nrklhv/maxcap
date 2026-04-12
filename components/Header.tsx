"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "./Logo";

export type HeaderVariant = "inversionista" | "vendedor";

export function Header({ variant }: { variant: HeaderVariant }) {
  const [open, setOpen] = useState(false);
  const ctaClass =
    variant === "inversionista"
      ? "bg-orange text-white hover:bg-[#E55A00]"
      : "bg-teal text-white hover:bg-[#085041]";

  const links =
    variant === "inversionista" ? (
      <>
        <Link
          href="/#pilares"
          className="border-b-2 border-transparent px-3.5 py-0 text-xs font-medium text-gray-2 transition-colors h-14 flex items-center text-gray-2 hover:text-white hover:border-orange"
          onClick={() => setOpen(false)}
        >
          La oportunidad
        </Link>
        <Link
          href="/#uvn"
          className="border-b-2 border-transparent px-3.5 py-0 text-xs font-medium text-gray-2 transition-colors h-14 flex items-center hover:text-white hover:border-orange"
          onClick={() => setOpen(false)}
        >
          Los números
        </Link>
        <Link
          href="/#alianza"
          className="border-b-2 border-transparent px-3.5 py-0 text-xs font-medium text-gray-2 transition-colors h-14 flex items-center hover:text-white hover:border-orange"
          onClick={() => setOpen(false)}
        >
          Quiénes somos
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
          href="/vendedor"
          className="border-b-2 border-transparent px-3.5 py-0 text-xs font-medium text-gray-2 transition-colors h-14 flex items-center hover:text-white hover:border-orange"
          onClick={() => setOpen(false)}
        >
          Vender propiedad
        </Link>
        <Link
          href="/#form"
          className={`ml-1 rounded-lg px-[18px] py-2 text-xs font-semibold border-b-0 h-auto ${ctaClass}`}
          onClick={() => setOpen(false)}
        >
          Reservar cupo
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
          href="/vendedor#form"
          className={`ml-1 rounded-lg px-[18px] py-2 text-xs font-semibold border-b-0 h-auto ${ctaClass}`}
          onClick={() => setOpen(false)}
        >
          Inscribirme
        </Link>
      </>
    );

  const logoHref = variant === "inversionista" ? "/#top" : "/vendedor";

  return (
    <>
      <header className="sticky top-0 z-[100] flex h-14 items-center justify-between border-b border-white/10 bg-dark/95 px-4 backdrop-blur-md md:px-10">
        <Link href={logoHref} className="opacity-85 transition-opacity hover:opacity-100">
          <Logo size="sm" />
        </Link>
        <nav className="hidden items-center gap-0 md:flex">{links}</nav>
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
          <nav className="flex flex-col gap-1 px-6 py-6">{links}</nav>
        </div>
      )}
    </>
  );
}
