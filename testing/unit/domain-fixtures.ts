import type { ClientAssignment, ClientInvitation, ClientProfile } from "@/modules/declarations/domain/clients";
import { CLIENT_PORTAL_ACK_VERSION } from "@/modules/platform/copy/portal-copy";
import type { SurveyQuestion } from "@/modules/declarations/question-models";
import type { SurveyWithStats } from "@/modules/declarations/domain/surveys";

const DEFAULT_USER_ID = "550e8400-e29b-41d4-a716-446655440003";
const DEFAULT_SURVEY_ID = "550e8400-e29b-41d4-a716-446655440002";

export function makeClientProfile(
  overrides: Partial<ClientProfile> = {},
): ClientProfile {
  return {
    userId: DEFAULT_USER_ID,
    fullLegalName: "Ada Client",
    nationality: "SG",
    countryOfResidence: "SG",
    additionalResidenceCountries: [],
    passportIssuingCountry: "SG",
    passportNumber: "A123",
    phone: "+65",
    entityName: "Ada Co",
    jurisdiction: "Singapore",
    notes: "",
    identityConsentAt: new Date("2026-01-01T00:00:00.000Z"),
    onboardingComplete: true,
    portalAckAt: new Date("2026-01-02T00:00:00.000Z"),
    portalAckVersion: CLIENT_PORTAL_ACK_VERSION,
    updatedAt: new Date("2026-01-03T00:00:00.000Z"),
    ...overrides,
  };
}

export function makeClientAssignment(
  overrides: Partial<ClientAssignment> = {},
): ClientAssignment {
  return {
    id: "550e8400-e29b-41d4-a716-446655440001",
    surveyId: DEFAULT_SURVEY_ID,
    clientEmail: "client@example.com",
    assignedBy: "ops@example.com",
    status: "pending",
    dueDate: null,
    submitBefore: null,
    confirmationCode: null,
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    surveyTitle: "Annual declaration",
    surveyQuestion: "Confirm your details",
    surveySlug: "annual",
    ...overrides,
  };
}

export function makeYesNoQuestion(
  overrides: Partial<SurveyQuestion> = {},
): SurveyQuestion {
  return {
    id: "q1",
    surveyId: DEFAULT_SURVEY_ID,
    prompt: "Confirm",
    type: "yes_no",
    required: true,
    sortOrder: 0,
    config: {},
    ...overrides,
  };
}

export function makeClientInvitation(
  overrides: Partial<ClientInvitation> = {},
): ClientInvitation {
  return {
    id: "inv-1",
    token: "tok",
    fullName: "Alex Morgan",
    email: "alex@example.com",
    invitedBy: "admin",
    status: "pending",
    expiresAt: new Date("2026-08-01T00:00:00.000Z"),
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    ...overrides,
  };
}

export function makeSurveyWithStats(
  overrides: Partial<SurveyWithStats> = {},
): SurveyWithStats {
  return {
    id: "survey-1",
    slug: "annual",
    title: "Annual declaration",
    question: "Confirm your details",
    userId: "admin-user",
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    referenceNumber: null,
    caseNumber: "CASE-1",
    effectiveDate: null,
    submitBefore: null,
    surveyorName: null,
    surveyorOrg: null,
    surveyeeIndividual: null,
    surveyeeOrg: null,
    purpose: null,
    categories: [],
    responseCount: 3,
    ...overrides,
  };
}
