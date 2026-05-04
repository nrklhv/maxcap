import type { Metadata } from "next";
import { BrokerLanding } from "@/components/BrokerLanding";
import { SeoJsonLd } from "@/components/SeoJsonLd";
import { brokerFaqItems } from "@/lib/faqBroker";
import { faqPageJsonLd } from "@/lib/faqJsonLd";
import { getSiteUrl } from "@/lib/site";

const title = "Programa Brokers";
const description =
  "Vende el Club MaxRent a tus inversionistas y gana 3% de comisión por cada venta cerrada. Plataforma de gestión y seguimiento incluida.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/brokers",
  },
  openGraph: {
    url: `${getSiteUrl()}/brokers`,
    title,
    description,
  },
  twitter: {
    title,
    description,
  },
};

export default function BrokersPage() {
  return (
    <>
      <BrokerLanding />
      <SeoJsonLd schema={faqPageJsonLd(brokerFaqItems)} />
    </>
  );
}
