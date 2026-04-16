import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dm-serif",
});

export const metadata: Metadata = {
  title: {
    default: "MaxRent",
    template: "%s",
  },
  description: "Tu portal de compra de propiedades",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${dmSans.variable} ${dmSerif.variable}`} style={{ height: "100%" }}>
      <body
        className="font-sans antialiased bg-gray-50 text-gray-900"
        style={{
          margin: 0,
          minHeight: "100%",
          fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
          backgroundColor: "#f9fafb",
          color: "#111827",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <SessionProvider>{children}</SessionProvider>
        <Analytics />
      </body>
    </html>
  );
}
