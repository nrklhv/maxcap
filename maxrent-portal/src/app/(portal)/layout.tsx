// =============================================================================
// Portal Layout — Sidebar + contenido principal
// =============================================================================
// Todas las páginas bajo /(portal)/ usan este layout.
// El middleware ya se encarga de proteger estas rutas.
// Carga datos compactos para la franja de “viaje del inversionista” y el CTA flotante de asesoría (si hay URL).
// =============================================================================

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdvisorMeetingFloatingCta } from "@/components/portal/AdvisorMeetingFloatingCta";
import { BrokerInvestorInviteClaimEffect } from "@/components/portal/BrokerInvestorInviteClaimEffect";
import { Sidebar } from "@/components/portal/sidebar";
import { InvestorJourneyStrip } from "@/components/portal/InvestorJourneyStrip";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildInvestorJourney } from "@/lib/portal/investor-journey";
import { isInvestorPerfilCompleteForPortal } from "@/lib/portal/profile-labor";

export const metadata: Metadata = {
  title: { absolute: "MaxRent - Inversionista" },
  description: "Portal de inversionistas MaxRent",
};

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [profile, latestEvaluation, reservationCount] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { onboardingCompleted: true, additionalData: true },
    }),
    prisma.creditEvaluation.findFirst({
      where: { userId: session.user.id },
      orderBy: { requestedAt: "desc" },
      select: { status: true, staffReservationApprovedAt: true },
    }),
    prisma.reservation.count({
      where: { userId: session.user.id, status: { in: ["PAID", "CONFIRMED"] } },
    }),
  ]);

  const journey = buildInvestorJourney({
    onboardingCompleted: isInvestorPerfilCompleteForPortal(profile),
    evaluation: latestEvaluation,
    reservationCount,
  });

  const advisorBookingUrl =
    process.env.NEXT_PUBLIC_ADVISOR_BOOKING_URL?.trim() || null;

  return (
    <div className="min-h-screen flex">
      <BrokerInvestorInviteClaimEffect />
      <Sidebar />
      <main className="flex-1 lg:ml-0 min-w-0 pb-32 sm:pb-36">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <InvestorJourneyStrip steps={journey.steps} next={journey.next} />
          {children}
        </div>
      </main>
      <AdvisorMeetingFloatingCta href={advisorBookingUrl} />
    </div>
  );
}
