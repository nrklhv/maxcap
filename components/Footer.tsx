import Link from "next/link";
import { Logo } from "./Logo";
import { getPortalUrl } from "@/lib/site";

const investorLinks = [
  { href: "/#top", label: "Inicio" },
  { href: "/#pilares", label: "La oportunidad" },
  { href: "/#uvn", label: "Los números" },
  { href: "/#alianza", label: "Quiénes somos" },
  { href: "/#pool", label: "Pool de propiedades" },
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

const brokerLinks = [
  { href: "/brokers#top", label: "Inicio" },
  { href: "/brokers#programa", label: "Por qué vender el Club" },
  { href: "/brokers#como", label: "Cómo funciona" },
  { href: "/brokers#faq", label: "Preguntas frecuentes" },
  { href: "/brokers#form", label: "Postular como broker" },
] as const;

export type FooterVariant = "inversionista" | "vendedor" | "broker";

export function Footer({ variant }: { variant: FooterVariant }) {
  const tagline = (() => {
    if (variant === "inversionista") {
      return "Club de Inversionistas Calificados. Compramos juntos para conseguir mejor precio y condiciones únicas en propiedades usadas.";
    }
    if (variant === "vendedor") {
      return "Canal exclusivo para vender tu propiedad arrendada a inversionistas calificados. Sin portales, sin complicaciones.";
    }
    return "Programa Brokers MaxRent. Vende el Club a tus inversionistas y gana 3% por cada venta cerrada.";
  })();

  const ctaHref =
    variant === "inversionista"
      ? "/#form"
      : variant === "broker"
        ? "/brokers#form"
        : "/vendedor#form";
  const ctaClass = variant === "vendedor" ? "text-teal" : "text-orange";
  const ctaLabel =
    variant === "inversionista"
      ? "Inscríbete al Club →"
      : variant === "broker"
        ? "Postular como broker →"
        : "Inscribir mi propiedad →";

  const crossHref =
    variant === "inversionista" ? "/vendedor" : variant === "broker" ? "/" : "/";
  const crossLabel =
    variant === "inversionista"
      ? "Vender propiedad"
      : variant === "broker"
        ? "Quiero invertir"
        : "Quiero invertir";

  const legalRight =
    variant === "inversionista"
      ? "Solo para inversionistas calificados · Confidencial"
      : variant === "broker"
        ? "Programa abierto a corredores y asesores"
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
            <strong className="font-medium text-gray-2">Una iniciativa de Houm</strong>
            <br />
            Houm · Renta Capital
            <br />
            Santiago, Chile
          </div>
        </div>
        <div>
          <h5 className="mb-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-2">Inversionistas</h5>
          {investorLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="mb-2 block text-[12.5px] text-gray-3 transition-colors hover:text-white"
            >
              {label}
            </Link>
          ))}
        </div>
        <div>
          <h5 className="mb-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-2">Brokers</h5>
          {brokerLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="mb-2 block text-[12.5px] text-gray-3 transition-colors hover:text-white"
            >
              {label}
            </Link>
          ))}
        </div>
        <div>
          <h5 className="mb-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-2">Vendedores</h5>
          {sellerLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="mb-2 block text-[12.5px] text-gray-3 transition-colors hover:text-white"
            >
              {label}
            </Link>
          ))}
        </div>
        <div>
          <h5 className="mb-3.5 text-[11px] font-semibold uppercase tracking-wider text-gray-2">Acceso</h5>
          <p className="mb-3 text-[12.5px] leading-relaxed text-gray-3">
            Un especialista de Renta Capital te contacta en menos de 24 horas.
          </p>
          <Link href={ctaHref} className={`mb-2 inline-block text-sm font-medium ${ctaClass}`}>
            {ctaLabel}
          </Link>
          <Link
            href={`${getPortalUrl()}/login`}
            className="block text-[12.5px] text-gray-3 transition-colors hover:text-white"
          >
            Iniciar sesión en el portal
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
        <span>© 2026 MaxRent by Houm · Houm SpA · Renta Capital</span>
        <span>{legalRight}</span>
      </div>
    </footer>
  );
}
