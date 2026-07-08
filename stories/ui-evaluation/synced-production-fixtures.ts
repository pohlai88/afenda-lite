import type { ClientAssignment, ClientProfile } from "@/lib/clients";
import {
  computeClientDashboardMetrics,
  type ClientDashboardMetrics,
} from "@/lib/client-dashboard-metrics";
import type { PortalMember } from "@/lib/portal-member-types";
import {
  productionSeedFixtures,
  SANDBOX_ACK_VERSION,
  SANDBOX_SURVEY,
} from "@/lib/production-fixtures";

const FIXTURE_USER_ID = "00000000-0000-0000-0000-000000000001";
const FIXTURE_SURVEY_ID = "00000000-0000-0000-0000-000000000002";
const FIXTURE_ASSIGNMENT_ID = "00000000-0000-0000-0000-000000000003";

const fixtureUpdatedAt = new Date("2026-07-01T12:00:00Z");
const fixtureConsentAt = new Date("2026-01-15T10:00:00Z");
const fixtureAckAt = new Date("2026-01-16T09:30:00Z");

export function syncedProductionFixtureLabel() {
  const { previewClient, declaration } = productionSeedFixtures;
  return `${previewClient.email} · ${previewClient.entityName} · ${declaration.title}`;
}

export function syncedPreviewClientProfile(): ClientProfile {
  const { previewClient } = productionSeedFixtures;

  return {
    userId: FIXTURE_USER_ID,
    fullLegalName: previewClient.displayName,
    nationality: previewClient.nationality,
    countryOfResidence: previewClient.countryOfResidence,
    additionalResidenceCountries: [],
    passportIssuingCountry: previewClient.passportIssuingCountry,
    passportNumber: previewClient.passportNumber,
    phone: previewClient.phone,
    entityName: previewClient.entityName,
    jurisdiction: previewClient.jurisdiction,
    notes: previewClient.notes,
    identityConsentAt: fixtureConsentAt,
    onboardingComplete: true,
    portalAckAt: fixtureAckAt,
    portalAckVersion: SANDBOX_ACK_VERSION,
    updatedAt: fixtureUpdatedAt,
  };
}

export function syncedPreviewClientAssignment(): ClientAssignment {
  const { previewClient, declaration } = productionSeedFixtures;

  return {
    id: FIXTURE_ASSIGNMENT_ID,
    surveyId: FIXTURE_SURVEY_ID,
    clientEmail: previewClient.email,
    assignedBy: productionSeedFixtures.operator.email,
    status: "pending",
    dueDate: null,
    submitBefore: new Date("2026-12-31T23:59:59Z"),
    createdAt: fixtureUpdatedAt,
    surveyTitle: declaration.title,
    surveyQuestion: SANDBOX_SURVEY.question,
    surveySlug: declaration.slug,
    confirmationCode: null,
  };
}

export function syncedPreviewClientMetrics(): ClientDashboardMetrics {
  return computeClientDashboardMetrics([syncedPreviewClientAssignment()]);
}

export function syncedPreviewClientMember(): PortalMember {
  const { previewClient } = productionSeedFixtures;
  const profile = syncedPreviewClientProfile();

  return {
    userId: FIXTURE_USER_ID,
    email: previewClient.email,
    authName: previewClient.displayName,
    displayName: previewClient.displayName,
    subtitle: previewClient.entityName,
    role: previewClient.role,
    context: "client",
    isPreviewSession: false,
    profile: {
      fullLegalName: profile.fullLegalName,
      entityName: profile.entityName,
      onboardingComplete: profile.onboardingComplete,
    },
  };
}
