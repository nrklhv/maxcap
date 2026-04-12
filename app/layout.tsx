import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import { SeoJsonLd } from "@/components/SeoJsonLd";
import { getMetadataBase, getSiteUrl } from "@/lib/site";
import { siteWideJsonLd } from "@/lib/siteJsonLd";
import "./globals.css";
import { MarketingAttributionCapture } from "@/components/MarketingAttributionCapture";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: "400",
  variable: "--font-dm-serif",
  display: "swap",
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: "MaxRent",
    template: "%s · MaxRent",
  },
  description: "Inversión y venta de propiedades usadas en Chile.",
  openGraph: {
    type: "website",
    locale: "es_CL",
    siteName: "MaxRent",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${dmSans.variable} ${dmSerif.variable} font-sans`}>
        <MarketingAttributionCapture />
        {children}
        <SeoJsonLd schema={siteWideJsonLd(siteUrl)} />
      </body>
    </html>
  );
}
