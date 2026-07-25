import { fail } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";

import { createLegalCompany } from "../src/legal-company";
import { createMemoryCorporateAdministrationStore } from "../src/memory-store";
import { CA_PERMISSION_CODES } from "../src/permissions";
import {
	amendCharge,
	cancelInsurancePolicy,
	disposeCorporateAsset,
	disposeIntellectualProperty,
	disposeProperty,
	expireIntellectualProperty,
	listCharges,
	listCorporateAssets,
	listInsurancePolicies,
	listIntellectualProperty,
	listProperties,
	registerCharge,
	registerCorporateAsset,
	registerInsurancePolicy,
	registerIntellectualProperty,
	registerProperty,
	releaseCharge,
	renewInsurancePolicy,
	renewIntellectualProperty,
	updateCorporateAsset,
	updateInsurancePolicy,
	updateIntellectualProperty,
	updateProperty,
	writeOffCorporateAsset,
} from "../src/property-assets";
import { createGrantingCaAuthorization } from "./helpers/memory-authorization";
import {
	createMemoryCaMasterLookup,
	seedLegalEntityDimension,
	seedOrganizationParty,
} from "./helpers/memory-masters";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORG_A = "org-a";
const DIM_A = "10000000-0000-4000-8000-000000000001";
const PARTY_A = "20000000-0000-4000-8000-000000000001";

function harness() {
	const store = createMemoryCorporateAdministrationStore();
	const ports = createMemoryMutationPorts();
	const masters = createMemoryCaMasterLookup({
		dimensions: [seedLegalEntityDimension(DIM_A, "LE-A", "Legal Entity A")],
		parties: [seedOrganizationParty(ORG_A, PARTY_A, "PARTY-A")],
		countries: [
			{
				id: "30000000-0000-4000-8000-000000000001",
				code: "MY",
				alpha3: "MYS",
				name: "Malaysia",
				active: true,
			},
		],
	});
	const authorization = createGrantingCaAuthorization([...CA_PERMISSION_CODES]);
	return {
		store,
		ports,
		masters,
		authorization,
		options: { store, ports, masters, authorization },
	};
}

function command(
	legalCompanyId: string,
	key: string,
	overrides: Record<string, unknown> = {},
) {
	return {
		organizationId: ORG_A,
		actorUserId: "user-1",
		correlationId: `corr-${key}`,
		idempotencyKey: key,
		legalCompanyId,
		...overrides,
	};
}

async function seedCompany() {
	const ready = harness();
	const company = await createLegalCompany(
		{
			organizationId: ORG_A,
			actorUserId: "user-1",
			correlationId: "corr-company",
			idempotencyKey: "company-ca4",
			requestFingerprint: "company-ca4-fingerprint",
			code: "CO-CA4",
			legalEntityDimensionId: DIM_A,
		},
		ready.options,
	);
	expect(company.ok).toBe(true);
	if (!company.ok) throw new Error(company.message);
	return { ...ready, company: company.data };
}

describe("@afenda/corporate-administration CA-4 lifecycle", () => {
	it("rolls back the entity and receipt when atomic facts fail", async () => {
		const { company, store, options } = await seedCompany();
		const failed = await registerProperty(
			command(company.id, "property-atomic-failure", {
				code: "PROP-FAIL",
				propertyType: "freehold",
				titleReference: "TITLE-FAIL",
				propertyDescription: "Must not survive",
				ownershipPercentage: "100",
				acquisitionDate: "2024-01-01",
			}),
			{
				...options,
				ports: {
					audit: {
						async record() {
							return fail("INTERNAL_ERROR", "Injected audit failure");
						},
					},
					outbox: {
						async append() {
							return fail("INTERNAL_ERROR", "Injected outbox failure");
						},
					},
					async record() {
						return fail("INTERNAL_ERROR", "Injected transaction failure");
					},
				},
			},
		);
		expect(failed).toMatchObject({ ok: false, code: "INTERNAL_ERROR" });
		const listed = await store.listPropertyHoldings(ORG_A, company.id);
		expect(listed).toMatchObject({ ok: true, data: [] });
		const receipt = await store.getPropertyAssetMutationReceipt(
			ORG_A,
			"property-atomic-failure",
		);
		expect(receipt).toMatchObject({ ok: true, data: null });
	});

	it("serializes concurrent property title and idempotency races", async () => {
		const { company, options } = await seedCompany();
		const base = {
			code: "PROP-RACE",
			propertyType: "freehold",
			titleReference: "TITLE-RACE",
			propertyDescription: "Concurrent property",
			ownershipPercentage: "100",
			acquisitionDate: "2024-01-01",
		};
		const [first, second] = await Promise.all([
			registerProperty(command(company.id, "property-race-a", base), options),
			registerProperty(
				command(company.id, "property-race-b", {
					...base,
					code: "PROP-RACE-2",
				}),
				options,
			),
		]);
		expect([first.ok, second.ok].filter(Boolean)).toHaveLength(1);
		expect([first, second].find((result) => !result.ok)).toMatchObject({
			ok: false,
			code: "CONFLICT",
		});

		const replayInput = command(company.id, "property-replay-race", {
			...base,
			code: "PROP-REPLAY",
			titleReference: "TITLE-REPLAY",
		});
		const [replayOne, replayTwo] = await Promise.all([
			registerProperty(replayInput, options),
			registerProperty(replayInput, options),
		]);
		expect(replayOne.ok && replayTwo.ok).toBe(true);
		if (replayOne.ok && replayTwo.ok) {
			expect(replayOne.data.id).toBe(replayTwo.data.id);
		}
	});

	it("executes all property and corporate-asset transitions with CAS", async () => {
		const { company, options } = await seedCompany();
		const property = await registerProperty(
			command(company.id, "property-register", {
				code: "PROP-01",
				propertyType: "freehold",
				titleReference: " TITLE-123 ",
				propertyDescription: "Head office land",
				ownershipPercentage: "100.000",
				acquisitionDate: "2020-01-01",
			}),
			options,
		);
		expect(property.ok).toBe(true);
		if (!property.ok) return;
		expect(property.data.normalizedTitleReference).toBe("TITLE-123");
		expect(property.data.ownershipPercentage).toBe("100");

		const updatedProperty = await updateProperty(
			command(company.id, "property-update", {
				id: property.data.id,
				expectedVersion: 1,
				propertyDescription: "Registered head office land",
				ownershipPercentage: "75.5",
			}),
			options,
		);
		expect(updatedProperty.ok).toBe(true);
		if (!updatedProperty.ok) return;
		expect(updatedProperty.data.version).toBe(2);

		const stale = await updateProperty(
			command(company.id, "property-stale", {
				id: property.data.id,
				expectedVersion: 1,
				propertyDescription: "Stale correction",
			}),
			options,
		);
		expect(stale).toMatchObject({ ok: false, code: "CONFLICT" });

		const disposedProperty = await disposeProperty(
			command(company.id, "property-dispose", {
				id: property.data.id,
				expectedVersion: 2,
				disposalDate: "2025-01-01",
				reason: "Sold",
				evidenceReference: "document:property-sale",
			}),
			options,
		);
		expect(disposedProperty).toMatchObject({
			ok: true,
			data: { status: "disposed", version: 3 },
		});

		const asset = await registerCorporateAsset(
			command(company.id, "asset-register", {
				code: "VEH-01",
				assetCategory: "vehicle",
				identifier: " VIN 123 ",
				description: "Company vehicle",
				acquisitionDate: "2021-01-01",
			}),
			options,
		);
		expect(asset.ok).toBe(true);
		if (!asset.ok) return;
		const updatedAsset = await updateCorporateAsset(
			command(company.id, "asset-update", {
				id: asset.data.id,
				expectedVersion: 1,
				description: "Executive company vehicle",
			}),
			options,
		);
		expect(updatedAsset.ok).toBe(true);
		if (!updatedAsset.ok) return;
		const writtenOff = await writeOffCorporateAsset(
			command(company.id, "asset-writeoff", {
				id: asset.data.id,
				expectedVersion: 2,
				effectiveDate: "2025-02-01",
				reason: "Accident loss",
				evidenceReference: "document:write-off",
			}),
			options,
		);
		expect(writtenOff).toMatchObject({
			ok: true,
			data: { status: "written_off", disposalDate: null },
		});
		const impossibleDispose = await disposeCorporateAsset(
			command(company.id, "asset-dispose-after-writeoff", {
				id: asset.data.id,
				expectedVersion: 3,
				effectiveDate: "2025-03-01",
				reason: "Impossible",
				evidenceReference: "document:none",
			}),
			options,
		);
		expect(impossibleDispose).toMatchObject({ ok: false, code: "CONFLICT" });

		const properties = await listProperties(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				legalCompanyId: company.id,
			},
			options,
		);
		const assets = await listCorporateAssets(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				legalCompanyId: company.id,
			},
			options,
		);
		expect(properties.ok && properties.data).toHaveLength(1);
		expect(assets.ok && assets.data).toHaveLength(1);
	});

	it("records IP and insurance renewal facts and terminal states", async () => {
		const { company, store, options } = await seedCompany();
		const ip = await registerIntellectualProperty(
			command(company.id, "ip-register", {
				code: "IP-01",
				rightType: "trademark",
				jurisdictionCode: "MY",
				registrationNumber: "TM-123",
				ownerPartyId: PARTY_A,
				filingDate: "2020-01-01",
				grantDate: "2021-01-01",
				expiryDate: "2026-01-01",
			}),
			options,
		);
		expect(ip.ok).toBe(true);
		if (!ip.ok) return;
		const updatedIp = await updateIntellectualProperty(
			command(company.id, "ip-update", {
				id: ip.data.id,
				expectedVersion: 1,
				expiryDate: "2026-06-01",
			}),
			options,
		);
		expect(updatedIp.ok).toBe(true);
		if (!updatedIp.ok) return;
		const renewedIp = await renewIntellectualProperty(
			command(company.id, "ip-renew", {
				id: ip.data.id,
				expectedVersion: 2,
				renewalDate: "2026-05-01",
				newExpiryDate: "2031-06-01",
				evidenceReference: "document:ip-renewal",
			}),
			options,
		);
		expect(renewedIp).toMatchObject({
			ok: true,
			data: { expiryDate: "2031-06-01", version: 3 },
		});
		const ipRenewals = await store.listIntellectualPropertyRenewals(
			ORG_A,
			ip.data.id,
		);
		expect(ipRenewals.ok && ipRenewals.data).toHaveLength(1);
		const expiredTooSoon = await expireIntellectualProperty(
			command(company.id, "ip-expire-too-soon", {
				id: ip.data.id,
				expectedVersion: 3,
				effectiveDate: "2030-01-01",
				reason: "Expiry",
				evidenceReference: "document:expiry",
			}),
			options,
		);
		expect(expiredTooSoon).toMatchObject({ ok: false, code: "BAD_REQUEST" });
		const disposedIp = await disposeIntellectualProperty(
			command(company.id, "ip-dispose", {
				id: ip.data.id,
				expectedVersion: 3,
				effectiveDate: "2027-01-01",
				reason: "Assigned",
				evidenceReference: "document:assignment",
			}),
			options,
		);
		expect(disposedIp).toMatchObject({
			ok: true,
			data: { status: "disposed" },
		});

		const policy = await registerInsurancePolicy(
			command(company.id, "insurance-register", {
				policyNumber: "POL-001",
				insurerPartyId: PARTY_A,
				coveredSubject: { kind: "company" },
				effectiveFrom: "2025-01-01",
				effectiveTo: "2025-12-31",
				documentReference: "document:policy",
			}),
			options,
		);
		expect(policy.ok).toBe(true);
		if (!policy.ok) return;
		const updatedPolicy = await updateInsurancePolicy(
			command(company.id, "insurance-update", {
				id: policy.data.id,
				expectedVersion: 1,
				coveredSubject: {
					kind: "intellectual-property",
					intellectualPropertyRightId: ip.data.id,
				},
				documentReference: "document:policy-endorsement",
			}),
			options,
		);
		expect(updatedPolicy.ok).toBe(true);
		if (!updatedPolicy.ok) return;
		const renewedPolicy = await renewInsurancePolicy(
			command(company.id, "insurance-renew", {
				id: policy.data.id,
				expectedVersion: 2,
				renewalDate: "2025-12-01",
				newEffectiveTo: "2026-12-31",
				documentReference: "document:policy-renewal",
				evidenceReference: "document:renewal-approval",
			}),
			options,
		);
		expect(renewedPolicy.ok).toBe(true);
		const policyRenewals = await store.listInsurancePolicyRenewals(
			ORG_A,
			policy.data.id,
		);
		expect(policyRenewals.ok && policyRenewals.data).toHaveLength(1);
		const cancelled = await cancelInsurancePolicy(
			command(company.id, "insurance-cancel", {
				id: policy.data.id,
				expectedVersion: 3,
				cancellationDate: "2026-06-01",
				reason: "Coverage replaced",
				evidenceReference: "document:cancellation",
			}),
			options,
		);
		expect(cancelled).toMatchObject({
			ok: true,
			data: { status: "cancelled", version: 4 },
		});
		const ips = await listIntellectualProperty(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				legalCompanyId: company.id,
			},
			options,
		);
		const policies = await listInsurancePolicies(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				legalCompanyId: company.id,
			},
			options,
		);
		expect(ips.ok && ips.data).toHaveLength(1);
		expect(policies.ok && policies.data).toHaveLength(1);
	});

	it("appends charge variations, releases historically, and rejects replay drift", async () => {
		const { company, store, options } = await seedCompany();
		const input = command(company.id, "charge-register", {
			code: "CHG-01",
			chargeType: "fixed",
			securedPartyId: PARTY_A,
			affectedSubject: { kind: "company" },
			priorityRank: 1,
			createdDate: "2024-01-01",
			evidenceReference: "document:charge",
		});
		const charge = await registerCharge(input, options);
		expect(charge.ok).toBe(true);
		if (!charge.ok) return;
		const replay = await registerCharge(input, options);
		expect(replay).toMatchObject({ ok: true, data: { id: charge.data.id } });
		const replayConflict = await registerCharge(
			{ ...input, chargeType: "floating" },
			options,
		);
		expect(replayConflict).toMatchObject({ ok: false, code: "CONFLICT" });

		const amended = await amendCharge(
			command(company.id, "charge-amend", {
				id: charge.data.id,
				expectedVersion: 1,
				variationDate: "2025-01-01",
				priorityRank: 2,
				evidenceReference: "document:variation",
			}),
			options,
		);
		expect(amended).toMatchObject({
			ok: true,
			data: { priorityRank: 2, version: 2 },
		});
		const variations = await store.listChargeVariations(ORG_A, charge.data.id);
		expect(variations.ok && variations.data).toHaveLength(1);
		const released = await releaseCharge(
			command(company.id, "charge-release", {
				id: charge.data.id,
				expectedVersion: 2,
				releasedDate: "2026-01-01",
				reason: "Debt satisfied",
				evidenceReference: "document:release",
			}),
			options,
		);
		expect(released).toMatchObject({
			ok: true,
			data: { status: "released", version: 3 },
		});
		const listed = await listCharges(
			{
				organizationId: ORG_A,
				actorUserId: "user-1",
				legalCompanyId: company.id,
			},
			options,
		);
		expect(listed.ok && listed.data).toHaveLength(1);
	});
});
