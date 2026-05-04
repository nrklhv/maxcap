import type { Metadata } from "next";
import { InvestorLanding } from "@/components/InvestorLanding";
import { SeoJsonLd } from "@/components/SeoJsonLd";
import { investorFaqItems } from "@/lib/faqInvestor";
import { faqPageJsonLd } from "@/lib/faqJsonLd";
import { getSiteUrl } from "@/lib/site";

const title = "Club de Inversionistas Calificados";
const description =
  "Juntos compramos mejor: 100 inversionistas calificados se unen para acceder a propiedades usadas con cap rate sobre 5%, comisión de compra 0% y administración en pool por Houm. Una iniciativa de Houm con Renta Capital.";

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
