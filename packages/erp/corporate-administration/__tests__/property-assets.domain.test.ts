import { describe, expect, it } from "vitest";

import { createLegalCompany } from "../src/legal-company";
import { createMemoryCorporateAdministrationStore } from "../src/memory-store";
import { CA_PERMISSION_CODES } from "../src/permissions";
import {
	createCorporateAsset,
	createPropertyHolding,
	listCorporateAssets,
	listPropertyHoldings,
} from "../src/property-assets";
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

describe("@afenda/corporate-administration property assets", () => {
	it("creates property holding and corporate asset with list/get", async () => {
		const { store, ports, masters, authorization } = harness();
		const company = await createLegalCompany(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-pa-1",
				idempotencyKey: "company-pa-1",
				requestFingerprint: "fp-pa-1",
				code: "CO-PA",
				legalEntityDimensionId: DIM_A,
			},
			{ store, ports, masters, authorization },
		);
		expect(company.ok).toBe(true);
		if (!company.ok) return;

		const property = await createPropertyHolding(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-pa-2",
				idempotencyKey: "property-1",
				legalCompanyId: company.data.id,
				code: "PROP-01",
				propertyType: "freehold",
				titleReference: "TITLE-123",
				ownershipPercentage: "100",
				acquiredDate: "2020-01-01",
			},
			{ store, authorization },
		);
		expect(property.ok).toBe(true);

		const asset = await createCorporateAsset(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				correlationId: "corr-pa-3",
				idempotencyKey: "asset-1",
				legalCompanyId: company.data.id,
				code: "VEH-01",
				assetCategory: "vehicle",
				description: "Company vehicle",
			},
			{ store, authorization },
		);
		expect(asset.ok).toBe(true);

		const properties = await listPropertyHoldings(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				legalCompanyId: company.data.id,
			},
			{ store, authorization },
		);
		expect(properties.ok).toBe(true);
		if (properties.ok) {
			expect(properties.data).toHaveLength(1);
		}

		const assets = await listCorporateAssets(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				legalCompanyId: company.data.id,
			},
			{ store, authorization },
		);
		expect(assets.ok).toBe(true);
		if (assets.ok) {
			expect(assets.data).toHaveLength(1);
		}
	});
});
