import Link from "next/link";
import { Logo } from "./Logo";

const investorLinks = [
  { href: "/#top", label: "Inicio" },
  { href: "/#pilares", label: "La oportunidad" },
  { href: "/#uvn", label: "Los números" },
  { href: "/#alianza", label: "Quiénes somos" },
  { href: "/#como", label: "Cómo funciona" },
  { href: "/#faq", label: "Preguntas frecuentes" },
] as const;

const sellerLinks = [
  { href: "/vendedor#top", label: "Inicio" },
  { href: "/vendedor#requisitos", label: "Requisitos" },
  { href: "/vendedor#porque", label: "Por qué funciona" },
  { href: "/vendedor#calculadora", label: "Calculadora" },
  { href: "/vendedor#faq", label: "Preguntas frecuentes" },
  { href: "/vendedor#form", label: "Formulario" },
] as const;

export function Footer({ variant }: { variant: "inversionista" | "vendedor" }) {
  const isInv = variant === "inversionista";
  const tagline = isInv
    ? "Inversión en propiedades usadas sin poner pie. Rentabilidades 30% más altas que en una nueva."
    : "Canal exclusivo para vender tu propiedad arrendada a inversionistas calificados. Sin portales, sin complicaciones.";
  const ctaHref = isInv ? "/#top" : "/vendedor#form";
  const ctaClass = isInv ? "text-orange" : "text-teal";
  const ctaLabel = isInv ? "Reservar mi cupo →" : "Inscribir mi propiedad →";
  const crossHref = isInv ? "/vendedor" : "/";
  const crossLabel = isInv ? "Vender propiedad" : "Quiero invertir";
  const legalRight = isInv
    ? "Solo para inversionistas calificados · Confidencial"
    : "Solo para propiedades calificadas";

  return (
    <footer className="border-t border-white/10 bg-dark px-4 pb-8 pt-12 md:px-10 md:pb-8 md:pt-14">
      <div className="mb-8 grid grid-cols-1 gap-8 border-b border-white/10 pb-10 md:grid-cols-[1.3fr_1fr_1fr_1fr_1fr]">
        <div>
          <div className="mb-2">
            <Logo size="md" />
          </div>
          <p className="mb-5 max-w-[240px] text-xs leading-relaxed text-gray-3">{tagline}</p>
          <div className="text-[11px] leading-relaxed text-gray-3">
            <strong className="font-medium text-gray-2">La alianza</strong>
            <br />
            Houm · Renta Capital · Banco Aliado
            <br />
            Santiago, Chile
          </div>
        </div>
        <div>
          <h5 className="mb-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-2">Inversionistas</h5>
          {investorLinks.map(({ href, label }) => (
            <Link key={href} href={href} className="mb-2 block text-[12.5px] text-gray-3 transition-colors hover:text-white">
              {label}
            </Link>
          ))}
        </div>
        <div>
          <h5 className="mb-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-2">Vendedores</h5>
          {sellerLinks.map(({ href, label }) => (
            <Link key={href} href={href} className="mb-2 block text-[12.5px] text-gray-3 transition-colors hover:text-white">
              {label}
            </Link>
          ))}
        </div>
        <div>
          <h5 className="mb-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-2">Las empresas</h5>
          <a
            href="https://houm.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-2 block text-[12.5px] text-gray-3 transition-colors hover:text-white"
          >
            Houm
          </a>
          <span className="mb-2 block text-[12.5px] text-gray-3">Renta Capital</span>
          <a
            href="https://bci.cl"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-2 block text-[12.5px] text-gray-3 transition-colors hover:text-white"
          >
            Banco Aliado
          </a>
        </div>
        <div>
          <h5 className="mb-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-2">Contacto</h5>
          <p className="text-[12.5px] leading-relaxed text-gray-3">
            Un especialista te contacta en menos de 24 horas tras dejar tus datos.
          </p>
          <Link href={ctaHref} className={`mt-1.5 inline-block text-sm font-medium ${ctaClass}`}>
            {ctaLabel}
          </Link>
          <Link
            href={crossHref}
            className="mt-3 block text-[12.5px] text-gray-3 underline-offset-2 transition-colors hover:text-white"
          >
            {crossLabel}
          </Link>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-3">
        <span>© 2026 MaxRent · Houm SpA · Renta Capital · En alianza con Banco Aliado</span>
        <span>{legalRight}</span>
      </div>
    </footer>
  );
}
