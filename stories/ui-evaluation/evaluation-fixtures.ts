import type { OrgDeclarationRow } from "@/lib/pages/operator-dashboard-types";
import type { Survey } from "@/lib/domain/surveys";
import { productionSeedFixtures, SANDBOX_SURVEY } from "@/lib/production-fixtures";

/** Operator declaration rows for datatable evaluation stories (no server actions). */
export const previewDeclarationRows: OrgDeclarationRow[] = [
  {
    id: "decl-1",
    title: "E2E client journey 1783452156625",
    description: "Annual compliance declaration for client onboarding.",
    caseNumber: "CASE-2048",
    responseCount: 0,
  },
  {
    id: "decl-2",
    title: "Director statutory declaration",
    description: "Board member attestation for FY2025.",
    caseNumber: null,
    responseCount: 3,
  },
];

/** Operator survey fixture for declaration workspace stories (typed Survey, no DB). */
export function previewOperatorSurvey(): Survey {
  const { declaration } = productionSeedFixtures;

  return {
    id: "decl-preview-001",
    userId: "operator-preview",
    title: declaration.title,
    question: SANDBOX_SURVEY.question,
    slug: declaration.slug,
    referenceNumber: "REF-2026-014",
    caseNumber: "CASE-2048",
    effectiveDate: new Date("2026-07-01"),
    submitBefore: new Date("2026-08-15"),
    surveyorName: "Jane Operator",
    surveyorOrg: "Acme Compliance Ltd",
    surveyeeIndividual: null,
    surveyeeOrg: "Example Holdings",
    purpose: "FY2026 board attestation",
    categories: ["compliance", "annual"],
    createdAt: new Date("2026-06-01"),
  };
}
