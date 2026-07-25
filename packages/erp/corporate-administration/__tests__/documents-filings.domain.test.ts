import { describe, expect, it } from "vitest";

import {
	createCorporateDocument,
	createFilingObligation,
	createFilingSubmission,
	listFilingSubmissions,
} from "../src/documents-filings";
import { createLegalCompany } from "../src/legal-company";
import { createMemoryCorporateAdministrationStore } from "../src/memory-store";
import { CA_PERMISSION_CODES } from "../src/permissions";
import { createLegalCompanyTestInput } from "./helpers/legal-company-test-inputs";
import { createGrantingCaAuthorization } from "./helpers/memory-authorization";
import {
	createMemoryCaMasterLookup,
	seedLegalEntityDimension,
} from "./helpers/memory-masters";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORG_A = "org-a";
const DIM_A = "10000000-0000-4000-8000-000000000001";

function harness() {
	const store = createMemoryCorporateAdministrationStore();
	const ports = createMemoryMutationPorts();
	const masters = createMemoryCaMasterLookup({
		dimensions: [seedLegalEntityDimension(DIM_A, "LE-A", "Legal Entity A")],
		parties: [],
	});
	const authorization = createGrantingCaAuthorization([...CA_PERMISSION_CODES]);
	return { store, ports, masters, authorization };
}

describe("@afenda/corporate-administration documents filings", () => {
	it("creates document, filing obligation, and append-only submission", async () => {
		const { store, ports, masters, authorization } = harness();
		const company = await createLegalCompany(
			createLegalCompanyTestInput("company-df-1", {
				code: "CO-DF",
				correlationId: "corr-df-1",
				idempotencyKey: "company-df-1",
			}),
			{ store, ports, masters, authorization },
		);
		expect(company.ok).toBe(true);
		if (!company.ok) return;

		const document = await createCorporateDocument(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-df-2",
				idempotencyKey: "doc-1",
				legalCompanyId: company.data.id,
				documentCode: "CONSTITUTION",
				documentType: "constitution",
				title: "Company Constitution",
				externalReference: "s3://docs/constitution.pdf",
			},
			{ store, authorization },
		);
		expect(document.ok).toBe(true);

		const obligation = await createFilingObligation(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-df-3",
				idempotencyKey: "obligation-1",
				legalCompanyId: company.data.id,
				obligationCode: "AR-2024",
				filingType: "annual_return",
				authorityName: "SSM",
				periodLabel: "FY2024",
				dueDate: "2024-12-31",
			},
			{ store, authorization },
		);
		expect(obligation.ok).toBe(true);
		if (!obligation.ok) return;

		const submission = await createFilingSubmission(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-df-4",
				idempotencyKey: "submission-1",
				legalCompanyId: company.data.id,
				filingObligationId: obligation.data.id,
				submissionReference: "SUB-001",
				submittedAt: "2024-11-15T10:00:00.000Z",
				status: "submitted",
			},
			{ store, authorization },
		);
		expect(submission.ok).toBe(true);

		const submissions = await listFilingSubmissions(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				legalCompanyId: company.data.id,
			},
			{ store, authorization },
		);
		expect(submissions.ok).toBe(true);
		if (submissions.ok) {
			expect(submissions.data).toHaveLength(1);
		}
	});
});
