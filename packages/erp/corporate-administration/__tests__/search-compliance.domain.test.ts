import { describe, expect, it } from "vitest";

import { createFilingObligation } from "../src/documents-filings";
import { createLegalCompany } from "../src/legal-company";
import { createMemoryCorporateAdministrationStore } from "../src/memory-store";
import { CA_PERMISSION_CODES } from "../src/permissions";
import {
	listDueFilings,
	listOverdueFilings,
	searchCorporateRecords,
} from "../src/search-compliance";
import { createShareClass } from "../src/share-capital";
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

describe("@afenda/corporate-administration search compliance", () => {
	it("lists due and overdue filings and searches corporate records", async () => {
		const { store, ports, masters, authorization } = harness();
		const company = await createLegalCompany(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-scmp-1",
				idempotencyKey: "company-scmp-1",
				requestFingerprint: "fp-scmp-1",
				code: "CO-SCMP",
				legalEntityDimensionId: DIM_A,
			},
			{ store, ports, masters, authorization },
		);
		expect(company.ok).toBe(true);
		if (!company.ok) return;

		await createShareClass(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-scmp-2",
				idempotencyKey: "class-scmp-1",
				legalCompanyId: company.data.id,
				code: "PREF-A",
				classType: "preference",
				currencyCode: "MYR",
				parValue: "1.00",
				authorizedQuantity: "500000",
			},
			{ store, authorization },
		);

		await createFilingObligation(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-scmp-3",
				idempotencyKey: "obligation-due",
				legalCompanyId: company.data.id,
				obligationCode: "DUE-2024",
				filingType: "annual_return",
				authorityName: "SSM",
				periodLabel: "FY2024",
				dueDate: "2024-12-31",
			},
			{ store, authorization },
		);

		await createFilingObligation(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-scmp-4",
				idempotencyKey: "obligation-overdue",
				legalCompanyId: company.data.id,
				obligationCode: "LATE-2023",
				filingType: "annual_return",
				authorityName: "SSM",
				periodLabel: "FY2023",
				dueDate: "2023-12-31",
			},
			{ store, authorization },
		);

		const due = await listDueFilings(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				asOf: "2024-06-01",
				legalCompanyId: company.data.id,
			},
			{ store, authorization },
		);
		expect(due.ok).toBe(true);
		if (due.ok) {
			expect(due.data.some((row) => row.obligationCode === "DUE-2024")).toBe(
				true,
			);
		}

		const overdue = await listOverdueFilings(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				asOf: "2024-06-01",
				legalCompanyId: company.data.id,
			},
			{ store, authorization },
		);
		expect(overdue.ok).toBe(true);
		if (overdue.ok) {
			expect(
				overdue.data.some((row) => row.obligationCode === "LATE-2023"),
			).toBe(true);
		}

		const search = await searchCorporateRecords(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				query: "PREF-A",
				legalCompanyId: company.data.id,
			},
			{ store, authorization },
		);
		expect(search.ok).toBe(true);
		if (search.ok) {
			expect(search.data.some((hit) => hit.entityType === "share_class")).toBe(
				true,
			);
		}
	});
});
