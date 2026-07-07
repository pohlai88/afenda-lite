/** Shared production sandbox fixture identifiers (idempotent seeds + UI sync checks). */

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
  categories: ["sandbox", "operator-preview"],
};

export const SANDBOX_QUESTIONS = [
  {
    prompt: "I confirm the information provided is accurate.",
    type: "yes_no",
    required: true,
    sortOrder: 0,
    config: {},
  },
  {
    prompt: "Describe your relationship to the declaring entity.",
    type: "text",
    required: true,
    sortOrder: 1,
    config: { multiline: true },
  },
  {
    prompt: "Upload supporting evidence (metadata only in sandbox).",
    type: "file",
    required: false,
    sortOrder: 2,
    config: { accept: ".pdf,.png,.jpg", maxSizeMb: 10 },
  },
];
