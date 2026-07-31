import { describe, expect, it } from "vitest";
import {
	addCompanyName,
	type CompanyLegalFormStore,
	type CompanyNameStore,
	type LegalCompanyStore,
	registerLegalCompanyDraft,
} from "../../src";
import {
	caCommandOptions,
	caDraftInput,
	createMemoryCompanyDependencies,
	expectOk,
	uniqueCaOrganizationId,
} from "../helpers/legal-company-test-kit";

type CompanyHistoryStore = LegalCompanyStore &
	CompanyNameStore &
	CompanyLegalFormStore;
function createHistoryDependencies(input: {
	audits: unknown[];
	events: unknown[];
}) {
	const dependencies = createMemoryCompanyDependencies(input);
	const store = dependencies.store as CompanyHistoryStore;
	return {
		...dependencies,
		nameStore: store,
		legalFormStore: store,
	};
}
describe("company name and legal-form atomicity evidence", () => {
	it("redacts source documents, approval details and protected party data from audit/event snapshots", async () => {
		const audits: unknown[] = [];
		const events: unknown[] = [];
		const dependencies = createHistoryDependencies({ audits, events });
		const organizationId = uniqueCaOrganizationId("name-redaction");
		const options = caCommandOptions({ organizationId });
		const registered = await registerLegalCompanyDraft(
			caDraftInput({
				companyCode: "af-redact",
				masterDataPartyId: "party-operational-name-can-differ",
			}),
			options,
			dependencies,
		);
		expectOk(registered);
		const added = await addCompanyName(
			{
				legalCompanyId: registered.data.legalCompanyId,
				nameType: "legal",
				languageCode: "en",
				displayName: "Café Holdings",
				effectiveFrom: "2024-01-01",
				effectiveTo: null,
				sourceDocumentId:
					"doc:https://evidence.example/private.pdf?token=secret",
				expectedCompanyVersion: registered.data.version,
			},
			{
				...options,
				idempotencyKey: "idem-name-redaction",
			},
			dependencies,
		);
		expectOk(added);
		const snapshot = JSON.stringify({ audits, events });
		expect(snapshot).toContain(
			"corporate_administration.legal_company.name_added.v1",
		);
		for (const forbidden of [
			"evidence.example",
			"private.pdf",
			"token=secret",
			"approvalDecision",
			"approvalRequest",
			"party-operational-name-can-differ",
			"raw stack",
			"stack trace",
		]) {
			expect(snapshot).not.toContain(forbidden);
		}
	});
});
