import type { Metadata } from "next";
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
    default: "MaxRent · Recursos de marca",
    template: "%s · MaxRent",
  },
  description: "Recursos de marca, piezas de marketing y material de prensa de MaxRent.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${dmSans.variable} ${dmSerif.variable}`}>
      <body className="font-sans antialiased bg-cream text-dark min-h-screen">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
