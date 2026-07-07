/**
 * TypeScript mirror of scripts/lib/production-fixtures.mjs for Storybook and UI sync.
 * Keep in sync with the .mjs module when changing sandbox seed data.
 */

export const SANDBOX_SURVEY_SLUG = "sandbox-operator-preview";
export const SANDBOX_INVITE_TOKEN = "sandbox-preview-secure-link";

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
    role: "user" as const,
  },
  declaration: {
    slug: SANDBOX_SURVEY_SLUG,
    title: "Sandbox operator preview declaration",
    referenceNumber: "CDP-SANDBOX-001",
    questionTypes: ["yes_no", "text", "file"] as const,
  },
  metrics: {
    pending: 1,
    submitted: 0,
    dueSoon: 0,
  },
};
