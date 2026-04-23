import { NextResponse } from "next/server";
import { requireStaffSuperAdmin } from "@/lib/api-auth";
import * as investorService from "@/lib/services/investor.service";

/**
 * Staff: full read model for a portal investor (`canInvest`): user + profile + credit evaluations.
 *
 * @source GET /api/staff/investors/:id
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireStaffSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  const user = await investorService.getInvestorDetailForStaff(id);
  if (!user) {
    return NextResponse.json(
      { error: "Inversionista no encontrado o sin acceso al portal inversionista." },
      { status: 404 }
    );
  }

  const profile = user.profile
    ? {
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        contactEmail: user.profile.contactEmail,
        rut: user.profile.rut,
        phone: user.profile.phone,
        address: user.profile.address,
        commune: user.profile.commune,
        city: user.profile.city,
        onboardingCompleted: user.profile.onboardingCompleted,
        additionalData: user.profile.additionalData,
        createdAt: user.profile.createdAt.toISOString(),
        updatedAt: user.profile.updatedAt.toISOString(),
      }
    : null;

  const creditEvaluations = user.creditEvaluations.map((e) => ({
    id: e.id,
    status: e.status,
    score: e.score,
    riskLevel: e.riskLevel,
    maxApprovedAmount: e.maxApprovedAmount?.toString() ?? null,
    summary: e.summary,
    rawResponse: e.rawResponse,
    errorMessage: e.errorMessage,
    requestedAt: e.requestedAt.toISOString(),
    completedAt: e.completedAt?.toISOString() ?? null,
    consentAt: e.consentAt?.toISOString() ?? null,
    consentVersion: e.consentVersion,
    floidCaseId: e.floidCaseId,
    staffReservationApprovedAt: e.staffReservationApprovedAt?.toISOString() ?? null,
    staffReservationApprovedByUserId: e.staffReservationApprovedByUserId,
  }));

  const sponsorBroker = user.sponsorBroker
    ? {
        id: user.sponsorBroker.id,
        email: user.sponsorBroker.email,
        name: user.sponsorBroker.name,
        brokerAccessStatus: user.sponsorBroker.brokerAccessStatus,
      }
    : null;

  return NextResponse.json({
    investor: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      emailVerified: user.emailVerified?.toISOString() ?? null,
      canInvest: user.canInvest,
      brokerAccessStatus: user.brokerAccessStatus,
      brokerReviewedAt: user.brokerReviewedAt?.toISOString() ?? null,
      sponsorBrokerUserId: user.sponsorBrokerUserId,
      sponsorBrokerAssignedAt: user.sponsorBrokerAssignedAt?.toISOString() ?? null,
      sponsorBroker,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      profile,
      creditEvaluations,
    },
  });
}
