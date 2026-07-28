import { describe, expect, it } from "vitest";
import {
	canonicalDateSchema,
	canonicalInstantSchema,
	organizationIdSchema,
	userIdSchema,
} from "../../src";
import { createMemoryCorporateAdministrationLegalCompanyStore } from "../../src/testing";

describe("company status memory contract", () => {
	it("records status history, updates legal company state and resolves as-of status", async () => {
		const store = createMemoryCorporateAdministrationLegalCompanyStore();
		const organizationId = organizationIdSchema.parse("org_ca_status_memory");
		const actorUserId = userIdSchema.parse("user_ca_status_memory");
		const created = await store.registerLegalCompanyDraft({
			organizationId,
			companyCode: "CA-STATUS-001",
			normalizedCompanyCode: "CA-STATUS-001",
			displayName: "CA Status Memory Ltd",
			masterDataPartyId: "party_ca_status_memory",
			homeJurisdictionCountryCode: "MY",
			sourceReference: "DOC-STATUS-DRAFT",
			createdByUserId: actorUserId,
			correlationId: "corr-ca-status-memory",
			createdAt: canonicalInstantSchema.parse("2026-07-28T00:00:00.000Z"),
		});
		expect(created.ok).toBe(true);
		if (!created.ok) return;

		const activated = await store.changeLegalCompanyStatus({
			organizationId,
			legalCompanyId: created.data.legalCompanyId,
			status: "active",
			effectiveFrom: canonicalDateSchema.parse("2026-07-28"),
			recordedAt: canonicalInstantSchema.parse("2026-07-28T01:00:00.000Z"),
			recordedByUserId: actorUserId,
			reason: null,
			sourceDocumentId: "DOC-STATUS-ACTIVE",
			expectedCompanyVersion: created.data.version,
			correlationId: "corr-ca-status-memory",
		});
		expect(activated.ok).toBe(true);
		if (!activated.ok) return;
		expect(activated.data.status).toBe("active");
		expect(activated.data.version).toBe(2);

		const company = await store.getLegalCompany({
			organizationId,
			legalCompanyId: created.data.legalCompanyId,
		});
		expect(company.ok).toBe(true);
		if (!company.ok) return;
		expect(company.data?.state).toBe("active");
		expect(company.data?.version).toBe(2);

		const status = await store.findCompanyStatusAsOf({
			organizationId,
			legalCompanyId: created.data.legalCompanyId,
			asOf: canonicalDateSchema.parse("2026-07-28"),
		});
		expect(status.ok).toBe(true);
		if (!status.ok) return;
		expect(status.data?.status).toBe("active");

		const listed = await store.listCompaniesByStatus({
			organizationId,
			status: "active",
			pagination: { limit: 25 },
		});
		expect(listed.ok).toBe(true);
		if (!listed.ok) return;
		expect(listed.data.items).toHaveLength(1);
		expect(listed.data.items[0]?.state).toBe("active");
	});
});
