/**
 * TypeScript mirror of scripts/lib/production-fixtures.mjs for Storybook and UI sync.
 * Keep in sync with the .mjs module when changing sandbox seed data.
 */

export const SANDBOX_SURVEY_SLUG = "sandbox-operator-preview";
export const SANDBOX_INVITE_TOKEN = "sandbox-preview-secure-link";
export const SANDBOX_ACK_VERSION = "2026-01";

export const SANDBOX_SURVEY = {
  slug: SANDBOX_SURVEY_SLUG,
  title: "Sandbox operator preview declaration",
  question:
    "Complete this sandbox declaration to validate operator preview and client portal flows.",
  referenceNumber: "CDP-SANDBOX-001",
  caseNumber: "CASE-SANDBOX",
  surveyorName: "Portal Operator",
  surveyorOrg: "iam-check",
  surveyeeIndividual: "Preview Client",
  surveyeeOrg: "Preview Holdings Ltd",
  purpose: "Production sandbox — operator preview and playground UI validation only.",
  categories: ["sandbox", "operator-preview"] as const,
};

export const productionSeedFixtures = {
  operator: {
    email: "admin@iam-check.com",
    displayName: "Portal Operator",
    role: "admin" as const,
  },
  previewClient: {
    email: "preview-client@iam-check.com",
    displayName: "Preview Client",
    entityName: "Preview Holdings Ltd",
    jurisdiction: "Singapore",
    nationality: "SG",
    countryOfResidence: "SG",
    passportIssuingCountry: "SG",
    passportNumber: "E1234567",
    phone: "+1 555 0199",
    notes: "Sandbox account for operator client-portal preview.",
    role: "user" as const,
  },
  declaration: {
    slug: SANDBOX_SURVEY_SLUG,
    title: SANDBOX_SURVEY.title,
    referenceNumber: SANDBOX_SURVEY.referenceNumber,
    questionTypes: ["yes_no", "text", "file"] as const,
  },
  metrics: {
    pending: 1,
    submitted: 0,
    dueSoon: 0,
  },
};
