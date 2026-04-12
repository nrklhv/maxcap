import type { Metadata } from "next";
import { InvestorLanding } from "@/components/InvestorLanding";
import { SeoJsonLd } from "@/components/SeoJsonLd";
import { investorFaqItems } from "@/lib/faqInvestor";
import { faqPageJsonLd } from "@/lib/faqJsonLd";
import { getSiteUrl } from "@/lib/site";

const title = "Invierte en propiedades usadas sin poner pie";
const description =
  "Piloto exclusivo: propiedades usadas con renta desde el día 1. Alianza Houm, Renta Capital y Banco Aliado.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    url: getSiteUrl(),
    title,
    description,
  },
  twitter: {
    title,
    description,
  },
};

export default function Home() {
  return (
    <>
      <InvestorLanding />
      <SeoJsonLd schema={faqPageJsonLd(investorFaqItems)} />
    </>
  );
}
