import type { Metadata } from "next";
import { VendedorLanding } from "@/components/VendedorLanding";
import { SeoJsonLd } from "@/components/SeoJsonLd";
import { vendedorFaqItems } from "@/lib/faqVendedor";
import { faqPageJsonLd } from "@/lib/faqJsonLd";
import { getSiteUrl } from "@/lib/site";

const title = "Vende tu propiedad";
const description =
  "Liquidez para propiedades administradas por Houm y arrendadas. Evaluación sin costo.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/vendedor",
  },
  openGraph: {
    url: `${getSiteUrl()}/vendedor`,
    title,
    description,
  },
  twitter: {
    title,
    description,
  },
};

export default function VendedorPage() {
  return (
    <>
      <VendedorLanding />
      <SeoJsonLd schema={faqPageJsonLd(vendedorFaqItems)} />
    </>
  );
}
