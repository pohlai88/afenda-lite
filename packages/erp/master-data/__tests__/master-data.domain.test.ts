import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";
import { activatePartyRole, createPartyRole } from "../src/extensions";
import { activateItem, createItem, inactiveItem } from "../src/item";
import {
	activateItemGroup,
	createItemGroup,
	inactiveItemGroup,
} from "../src/item-group";
import {
	activateParty,
	createParty,
	getPartyById,
	inactiveParty,
	restoreParty,
	retireParty,
	updateParty,
} from "../src/party";
import {
	activatePaymentTerm,
	createPaymentTerm,
	getPaymentTermByCode,
	inactivePaymentTerm,
	listPaymentTerms,
	updatePaymentTerm,
} from "../src/payment-term";
import { masterListOptionsSchema } from "../src/schemas";
import { normalizeTaxRegistrationNumber } from "../src/shared/tax-registration-number";
import { validityRangesOverlap } from "../src/shared/validity-overlap";
import {
	activateTaxRegistration,
	blockTaxRegistration,
	createTaxRegistration,
	findTaxRegistrationsByParty,
	listTaxRegistrations,
	restoreTaxRegistration,
	retireTaxRegistration,
	updateTaxRegistration,
} from "../src/tax-registration";
import type { DependencyInspector } from "../src/types";
import {
	activateWarehouse,
	createWarehouse,
	inactiveWarehouse,
	moveWarehouse,
	retireWarehouse,
} from "../src/warehouse";
import { createMasterDataTestHarness } from "./helpers/harness";
import { approvedActivatePartyChangeRequest } from "./helpers/mdg-approve";
import type { createMemoryMasterDataStore } from "./helpers/memory-master-data-store";
import type { createMemoryMutationPorts } from "./helpers/memory-ports";

const EA_UOM_ID = "b1000000-0000-4000-8000-000000000001";

function ctx(organizationId = "org-a") {
	return {
		organizationId,
		actorUserId: "user-1",
		correlationId: randomUUID(),
	};
}

async function withActiveCustomerRole(
	partyId: string,
	options: {
		store: ReturnType<typeof createMemoryMasterDataStore>;
		ports: ReturnType<typeof createMemoryMutationPorts>;
	},
) {
	const role = await createPartyRole(
		{
			...ctx(),
			partyId,
			roleCode: "customer",
		},
		options,
	);
	expect(role.ok).toBe(true);
	if (!role.ok) {
		return role;
	}
	return activatePartyRole(
		{
			...ctx(),
			id: role.data.id,
			expectedVersion: role.data.version,
		},
		options,
	);
}

describe("@afenda/master-data domain", () => {
	it("UoM spine: create item group + item with baseUomId EA", async () => {
		const { options, ports } = createMasterDataTestHarness();

		const group = await createItemGroup(
			{
				...ctx(),
				code: "FG",
				name: "Finished goods",
			},
			options,
		);
		expect(group.ok).toBe(true);
		if (!group.ok) {
			return;
		}

		const item = await createItem(
			{
				...ctx(),
				code: "SKU-1",
				name: "Widget",
				itemType: "stock",
				baseUomId: EA_UOM_ID,
				itemGroupId: group.data.id,
			},
			options,
		);
		expect(item.ok).toBe(true);
		if (!item.ok) {
			return;
		}
		expect(item.data.baseUomId).toBe(EA_UOM_ID);
		expect(item.data.itemGroupId).toBe(group.data.id);
		expect(
			ports.outbox.calls.some(
				(call) => call.type === "master_data.item.created.v1",
			),
		).toBe(true);
	});

	it("version CAS conflict", async () => {
		const { options } = createMasterDataTestHarness();

		const created = await createParty(
			{
				...ctx(),
				code: "ACME",
				name: "Acme",
				partyKind: "organization",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const conflict = await updateParty(
			{
				...ctx(),
				id: created.data.id,
				expectedVersion: created.data.version + 1,
				name: "Acme Renamed",
			},
			options,
		);
		expect(conflict.ok).toBe(false);
		if (conflict.ok) {
			return;
		}
		expect(conflict.code).toBe("CONFLICT");
		expect((conflict.details as { reason?: string } | undefined)?.reason).toBe(
			"MASTER_VERSION_CONFLICT",
		);
	});

	it("cross-org get/update fail-closed", async () => {
		const { options } = createMasterDataTestHarness();

		const created = await createParty(
			{
				...ctx("org-a"),
				code: "ACME",
				name: "Acme",
				partyKind: "organization",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const got = await getPartyById(
			{
				organizationId: "org-b",
				actorUserId: "user-1",
				id: created.data.id,
			},
			options,
		);
		expect(got.ok).toBe(true);
		if (!got.ok) {
			return;
		}
		expect(got.data).toBeNull();

		const updated = await updateParty(
			{
				...ctx("org-b"),
				id: created.data.id,
				expectedVersion: created.data.version,
				name: "Hijack",
			},
			options,
		);
		expect(updated.ok).toBe(false);
		if (updated.ok) {
			return;
		}
		expect(updated.code).toBe("CONFLICT");
		expect((updated.details as { reason?: string } | undefined)?.reason).toBe(
			"MASTER_CROSS_ORG_REFERENCE",
		);
	});

	it("pageSize 101 rejected by schema", () => {
		const parsed = masterListOptionsSchema.safeParse({
			organizationId: "org-a",
			actorUserId: "user-1",
			pageSize: 101,
		});
		expect(parsed.success).toBe(false);
	});

	it("party activate/retire lifecycle", async () => {
		const { options, ports } = createMasterDataTestHarness();

		const created = await createParty(
			{
				...ctx(),
				code: "ACME",
				name: "Acme",
				partyKind: "organization",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		const roleReady = await withActiveCustomerRole(created.data.id, options);
		expect(roleReady.ok).toBe(true);
		if (!roleReady.ok) {
			return;
		}

		const cr = await approvedActivatePartyChangeRequest(
			{ organizationId: ctx().organizationId, partyId: created.data.id },
			options,
		);
		const activated = await activateParty(
			{
				...ctx(),
				id: created.data.id,
				expectedVersion: created.data.version,
				changeRequestId: cr.id,
			},
			options,
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) {
			return;
		}
		expect(activated.data.status).toBe("active");

		const retired = await retireParty(
			{
				...ctx(),
				id: activated.data.id,
				expectedVersion: activated.data.version,
			},
			options,
		);
		expect(retired.ok).toBe(true);
		if (!retired.ok) {
			return;
		}
		expect(retired.data.status).toBe("retired");
		expect(
			ports.outbox.calls.some(
				(call) => call.type === "master_data.party.activated.v1",
			),
		).toBe(true);
		expect(
			ports.outbox.calls.some(
				(call) => call.type === "master_data.party.retired.v1",
			),
		).toBe(true);
	});

	it("code conflict", async () => {
		const { options } = createMasterDataTestHarness();

		const first = await createParty(
			{
				...ctx(),
				code: "acme",
				name: "Acme",
				partyKind: "organization",
			},
			options,
		);
		expect(first.ok).toBe(true);

		const second = await createParty(
			{
				...ctx(),
				code: "ACME",
				name: "Acme Two",
				partyKind: "organization",
			},
			options,
		);
		expect(second.ok).toBe(false);
		if (second.ok) {
			return;
		}
		expect(second.code).toBe("CONFLICT");
		expect((second.details as { reason?: string } | undefined)?.reason).toBe(
			"MASTER_CODE_CONFLICT",
		);
	});

	it("warehouse create + dependency-blocked retire", async () => {
		const { options } = createMasterDataTestHarness();
		const created = await createWarehouse(
			{
				...ctx(),
				code: "WH-1",
				name: "Main",
				locationType: "warehouse",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const inspector: DependencyInspector = {
			async listBlockers() {
				return [
					{
						module: "inventory",
						entityType: "stock_balance",
						entityId: "bal-1",
						reason: "open balance",
					},
				];
			},
		};
		const blocked = await retireWarehouse(
			{
				...ctx(),
				id: created.data.id,
				expectedVersion: created.data.version,
			},
			{ ...options, dependencyInspector: inspector },
		);
		expect(blocked.ok).toBe(false);
		if (blocked.ok) {
			return;
		}
		expect(blocked.code).toBe("CONFLICT");
		expect((blocked.details as { reason?: string } | undefined)?.reason).toBe(
			"MASTER_DEPENDENCY_BLOCKED",
		);
	});

	it("item group and warehouse activate/inactive lifecycle", async () => {
		const { options, ports } = createMasterDataTestHarness();

		const group = await createItemGroup(
			{ ...ctx(), code: "FG", name: "Finished goods" },
			options,
		);
		expect(group.ok).toBe(true);
		if (!group.ok) {
			return;
		}

		const activatedGroup = await activateItemGroup(
			{
				...ctx(),
				id: group.data.id,
				expectedVersion: group.data.version,
			},
			options,
		);
		expect(activatedGroup.ok).toBe(true);
		if (!activatedGroup.ok) {
			return;
		}
		expect(activatedGroup.data.status).toBe("active");

		const inactiveGroup = await inactiveItemGroup(
			{
				...ctx(),
				id: activatedGroup.data.id,
				expectedVersion: activatedGroup.data.version,
			},
			options,
		);
		expect(inactiveGroup.ok).toBe(true);
		if (!inactiveGroup.ok) {
			return;
		}
		expect(inactiveGroup.data.status).toBe("inactive");

		const warehouse = await createWarehouse(
			{
				...ctx(),
				code: "WH-MAIN",
				name: "Main",
				locationType: "warehouse",
			},
			options,
		);
		expect(warehouse.ok).toBe(true);
		if (!warehouse.ok) {
			return;
		}

		const activatedWh = await activateWarehouse(
			{
				...ctx(),
				id: warehouse.data.id,
				expectedVersion: warehouse.data.version,
			},
			options,
		);
		expect(activatedWh.ok).toBe(true);
		if (!activatedWh.ok) {
			return;
		}
		expect(activatedWh.data.status).toBe("active");

		const inactiveWh = await inactiveWarehouse(
			{
				...ctx(),
				id: activatedWh.data.id,
				expectedVersion: activatedWh.data.version,
			},
			options,
		);
		expect(inactiveWh.ok).toBe(true);
		if (!inactiveWh.ok) {
			return;
		}
		expect(inactiveWh.data.status).toBe("inactive");
		expect(
			ports.outbox.calls.some(
				(call) => call.type === "master_data.item_group.activated.v1",
			),
		).toBe(true);
		expect(
			ports.outbox.calls.some(
				(call) => call.type === "master_data.warehouse.inactive.v1",
			),
		).toBe(true);
	});

	it("activateItem requires active item group", async () => {
		const { options } = createMasterDataTestHarness();

		const group = await createItemGroup(
			{ ...ctx(), code: "FG", name: "Finished goods" },
			options,
		);
		expect(group.ok).toBe(true);
		if (!group.ok) {
			return;
		}

		const item = await createItem(
			{
				...ctx(),
				code: "SKU-1",
				name: "Widget",
				itemType: "stock",
				baseUomId: EA_UOM_ID,
				itemGroupId: group.data.id,
			},
			options,
		);
		expect(item.ok).toBe(true);
		if (!item.ok) {
			return;
		}

		const blocked = await activateItem(
			{
				...ctx(),
				id: item.data.id,
				expectedVersion: item.data.version,
			},
			options,
		);
		expect(blocked.ok).toBe(false);
		if (blocked.ok) {
			return;
		}
		expect((blocked.details as { reason?: string } | undefined)?.reason).toBe(
			"MASTER_INVALID_STATE",
		);

		const activatedGroup = await activateItemGroup(
			{
				...ctx(),
				id: group.data.id,
				expectedVersion: group.data.version,
			},
			options,
		);
		expect(activatedGroup.ok).toBe(true);
		if (!activatedGroup.ok) {
			return;
		}

		const activated = await activateItem(
			{
				...ctx(),
				id: item.data.id,
				expectedVersion: item.data.version,
			},
			options,
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) {
			return;
		}
		expect(activated.data.status).toBe("active");

		const inactivated = await inactiveItem(
			{
				...ctx(),
				id: activated.data.id,
				expectedVersion: activated.data.version,
			},
			options,
		);
		expect(inactivated.ok).toBe(true);
		if (!inactivated.ok) {
			return;
		}
		expect(inactivated.data.status).toBe("inactive");
	});

	it("warehouse move rejects cycles", async () => {
		const { options } = createMasterDataTestHarness();

		const parent = await createWarehouse(
			{
				...ctx(),
				code: "WH-P",
				name: "Parent",
				locationType: "warehouse",
			},
			options,
		);
		expect(parent.ok).toBe(true);
		if (!parent.ok) {
			return;
		}

		const child = await createWarehouse(
			{
				...ctx(),
				code: "WH-C",
				name: "Child",
				locationType: "bin",
				parentId: parent.data.id,
			},
			options,
		);
		expect(child.ok).toBe(true);
		if (!child.ok) {
			return;
		}

		const cycle = await moveWarehouse(
			{
				...ctx(),
				id: parent.data.id,
				expectedVersion: parent.data.version,
				parentId: child.data.id,
			},
			options,
		);
		expect(cycle.ok).toBe(false);
		if (cycle.ok) {
			return;
		}
		expect(cycle.code).toBe("BAD_REQUEST");
	});

	it("party restore emits restored not created", async () => {
		const { options, ports } = createMasterDataTestHarness();

		const created = await createParty(
			{
				...ctx(),
				code: "ACME",
				name: "Acme",
				partyKind: "organization",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		const roleReady = await withActiveCustomerRole(created.data.id, options);
		expect(roleReady.ok).toBe(true);
		if (!roleReady.ok) {
			return;
		}

		const cr = await approvedActivatePartyChangeRequest(
			{ organizationId: ctx().organizationId, partyId: created.data.id },
			options,
		);
		const activated = await activateParty(
			{
				...ctx(),
				id: created.data.id,
				expectedVersion: created.data.version,
				changeRequestId: cr.id,
			},
			options,
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) {
			return;
		}

		const retired = await retireParty(
			{
				...ctx(),
				id: activated.data.id,
				expectedVersion: activated.data.version,
			},
			options,
		);
		expect(retired.ok).toBe(true);
		if (!retired.ok) {
			return;
		}

		ports.outbox.calls.length = 0;
		const restored = await restoreParty(
			{
				...ctx(),
				id: retired.data.id,
				expectedVersion: retired.data.version,
			},
			options,
		);
		expect(restored.ok).toBe(true);
		if (!restored.ok) {
			return;
		}
		expect(restored.data.status).toBe("draft");
		expect(
			ports.outbox.calls.some(
				(call) => call.type === "master_data.party.restored.v1",
			),
		).toBe(true);
		expect(
			ports.outbox.calls.some(
				(call) => call.type === "master_data.party.created.v1",
			),
		).toBe(false);
	});

	it("party inactive lifecycle", async () => {
		const { options, ports } = createMasterDataTestHarness();

		const created = await createParty(
			{
				...ctx(),
				code: "ACME",
				name: "Acme",
				partyKind: "organization",
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		const roleReady = await withActiveCustomerRole(created.data.id, options);
		expect(roleReady.ok).toBe(true);
		if (!roleReady.ok) {
			return;
		}

		const cr = await approvedActivatePartyChangeRequest(
			{ organizationId: ctx().organizationId, partyId: created.data.id },
			options,
		);
		const activated = await activateParty(
			{
				...ctx(),
				id: created.data.id,
				expectedVersion: created.data.version,
				changeRequestId: cr.id,
			},
			options,
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) {
			return;
		}

		const inactivated = await inactiveParty(
			{
				...ctx(),
				id: activated.data.id,
				expectedVersion: activated.data.version,
			},
			options,
		);
		expect(inactivated.ok).toBe(true);
		if (!inactivated.ok) {
			return;
		}
		expect(inactivated.data.status).toBe("inactive");
		expect(
			ports.outbox.calls.some(
				(call) => call.type === "master_data.party.inactive.v1",
			),
		).toBe(true);
	});

	it("payment term create + getByCode + CAS + lifecycle outbox", async () => {
		const { options, ports } = createMasterDataTestHarness();

		const created = await createPaymentTerm(
			{
				...ctx(),
				code: "NET30",
				name: "Net 30",
				netDays: 30,
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		expect(created.data.netDays).toBe(30);
		expect(created.data.status).toBe("draft");

		const byCode = await getPaymentTermByCode(
			{ organizationId: "org-a", actorUserId: "user-1", code: "net30" },
			options,
		);
		expect(byCode.ok).toBe(true);
		if (!byCode.ok || byCode.data === null) {
			return;
		}
		expect(byCode.data.id).toBe(created.data.id);

		const listed = await listPaymentTerms(
			{ organizationId: "org-a", actorUserId: "user-1", pageSize: 50 },
			options,
		);
		expect(listed.ok).toBe(true);
		if (!listed.ok) {
			return;
		}
		expect(listed.data).toHaveLength(1);

		const casFail = await updatePaymentTerm(
			{
				...ctx(),
				id: created.data.id,
				expectedVersion: created.data.version + 1,
				name: "Net 30 renamed",
			},
			options,
		);
		expect(casFail.ok).toBe(false);
		if (casFail.ok) {
			return;
		}
		expect(casFail.code).toBe("CONFLICT");
		expect((casFail.details as { reason?: string } | undefined)?.reason).toBe(
			"MASTER_VERSION_CONFLICT",
		);

		const activated = await activatePaymentTerm(
			{
				...ctx(),
				id: created.data.id,
				expectedVersion: created.data.version,
			},
			options,
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) {
			return;
		}
		expect(activated.data.status).toBe("active");

		const inactive = await inactivePaymentTerm(
			{
				...ctx(),
				id: activated.data.id,
				expectedVersion: activated.data.version,
			},
			options,
		);
		expect(inactive.ok).toBe(true);
		if (!inactive.ok) {
			return;
		}
		expect(inactive.data.status).toBe("inactive");
		expect(
			ports.outbox.calls.some(
				(call) => call.type === "master_data.payment_term.created.v1",
			),
		).toBe(true);
		expect(
			ports.outbox.calls.some(
				(call) => call.type === "master_data.payment_term.inactive.v1",
			),
		).toBe(true);
	});

	it("tax registration tenancy · uniqueness · overlap · CAS · lifecycle", async () => {
		const { options, ports } = createMasterDataTestHarness();
		const countryId = "c1000000-0000-4000-8000-000000000001";

		const normalized = normalizeTaxRegistrationNumber("vat-123 / ab");
		expect(normalized.ok).toBe(true);
		if (!normalized.ok) {
			return;
		}
		expect(normalized.data.normalizedRegistrationNumber).toBe("VAT123AB");

		expect(
			validityRangesOverlap(
				{
					validFrom: new Date("2026-01-01T00:00:00.000Z"),
					validTo: new Date("2026-06-01T00:00:00.000Z"),
				},
				{
					validFrom: new Date("2026-05-01T00:00:00.000Z"),
					validTo: null,
				},
			),
		).toBe(true);

		const party = await createParty(
			{
				...ctx(),
				code: "TAX-P1",
				name: "Tax Party",
				partyKind: "organization",
			},
			options,
		);
		expect(party.ok).toBe(true);
		if (!party.ok) {
			return;
		}

		const created = await createTaxRegistration(
			{
				...ctx(),
				partyId: party.data.id,
				jurisdictionCountryId: countryId,
				registrationType: "vat_gst",
				registrationNumber: "VAT-123 / ab",
				name: "MY GST",
				validFrom: new Date("2026-01-01T00:00:00.000Z"),
			},
			options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		expect(created.data.normalizedRegistrationNumber).toBe("VAT123AB");
		expect(created.data.status).toBe("draft");

		const otherOrg = await createTaxRegistration(
			{
				...ctx("org-b"),
				partyId: party.data.id,
				jurisdictionCountryId: countryId,
				registrationType: "vat_gst",
				registrationNumber: "VAT-123 / ab",
			},
			options,
		);
		expect(otherOrg.ok).toBe(false);

		const dup = await createTaxRegistration(
			{
				...ctx(),
				partyId: party.data.id,
				jurisdictionCountryId: countryId,
				registrationType: "vat_gst",
				registrationNumber: "vat123ab",
			},
			options,
		);
		expect(dup.ok).toBe(false);
		if (dup.ok) {
			return;
		}
		expect((dup.details as { reason?: string } | undefined)?.reason).toBe(
			"MASTER_CODE_CONFLICT",
		);

		const casFail = await updateTaxRegistration(
			{
				...ctx(),
				id: created.data.id,
				expectedVersion: created.data.version + 1,
				name: "renamed",
			},
			options,
		);
		expect(casFail.ok).toBe(false);
		if (casFail.ok) {
			return;
		}
		expect((casFail.details as { reason?: string } | undefined)?.reason).toBe(
			"MASTER_VERSION_CONFLICT",
		);

		const noFrom = await createTaxRegistration(
			{
				...ctx(),
				partyId: party.data.id,
				jurisdictionCountryId: countryId,
				registrationType: "tin",
				registrationNumber: "TIN-1",
			},
			options,
		);
		expect(noFrom.ok).toBe(true);
		if (!noFrom.ok) {
			return;
		}
		const activateNoFrom = await activateTaxRegistration(
			{
				...ctx(),
				id: noFrom.data.id,
				expectedVersion: noFrom.data.version,
			},
			options,
		);
		expect(activateNoFrom.ok).toBe(false);
		if (activateNoFrom.ok) {
			return;
		}
		expect(
			(activateNoFrom.details as { reason?: string } | undefined)?.reason,
		).toBe("MASTER_INVALID_STATE");

		const activated = await activateTaxRegistration(
			{
				...ctx(),
				id: created.data.id,
				expectedVersion: created.data.version,
			},
			options,
		);
		expect(activated.ok).toBe(true);
		if (!activated.ok) {
			return;
		}
		expect(activated.data.status).toBe("active");

		const overlapSibling = await createTaxRegistration(
			{
				...ctx(),
				partyId: party.data.id,
				jurisdictionCountryId: countryId,
				registrationType: "vat_gst",
				registrationNumber: "VAT-999",
				validFrom: new Date("2026-03-01T00:00:00.000Z"),
			},
			options,
		);
		expect(overlapSibling.ok).toBe(true);
		if (!overlapSibling.ok) {
			return;
		}
		const overlapActivate = await activateTaxRegistration(
			{
				...ctx(),
				id: overlapSibling.data.id,
				expectedVersion: overlapSibling.data.version,
			},
			options,
		);
		expect(overlapActivate.ok).toBe(false);
		if (overlapActivate.ok) {
			return;
		}
		expect(
			(overlapActivate.details as { reason?: string } | undefined)?.reason,
		).toBe("MASTER_VALIDITY_OVERLAP");

		const listed = await listTaxRegistrations(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				partyId: party.data.id,
				pageSize: 50,
			},
			options,
		);
		expect(listed.ok).toBe(true);
		if (!listed.ok) {
			return;
		}
		expect(listed.data.length).toBeGreaterThanOrEqual(2);

		const pageCap = masterListOptionsSchema.safeParse({
			organizationId: "org-a",
			actorUserId: "user-1",
			pageSize: 101,
		});
		expect(pageCap.success).toBe(false);

		const byParty = await findTaxRegistrationsByParty(
			{
				organizationId: "org-a",
				actorUserId: "user-1",
				partyId: party.data.id,
			},
			options,
		);
		expect(byParty.ok).toBe(true);

		const blocked = await blockTaxRegistration(
			{
				...ctx(),
				id: activated.data.id,
				expectedVersion: activated.data.version,
			},
			options,
		);
		expect(blocked.ok).toBe(true);
		if (!blocked.ok) {
			return;
		}
		expect(blocked.data.status).toBe("blocked");

		const retired = await retireTaxRegistration(
			{
				...ctx(),
				id: blocked.data.id,
				expectedVersion: blocked.data.version,
			},
			options,
		);
		expect(retired.ok).toBe(true);
		if (!retired.ok) {
			return;
		}
		expect(retired.data.status).toBe("retired");

		const restored = await restoreTaxRegistration(
			{
				...ctx(),
				id: retired.data.id,
				expectedVersion: retired.data.version,
			},
			options,
		);
		expect(restored.ok).toBe(true);
		if (!restored.ok) {
			return;
		}
		expect(restored.data.status).toBe("draft");
		expect(
			ports.outbox.calls.some(
				(call) => call.type === "master_data.tax_registration.created.v1",
			),
		).toBe(true);
		expect(
			ports.outbox.calls.some(
				(call) => call.type === "master_data.tax_registration.activated.v1",
			),
		).toBe(true);
		expect(
			ports.outbox.calls.some(
				(call) => call.type === "master_data.tax_registration.blocked.v1",
			),
		).toBe(true);
		expect(
			ports.outbox.calls.some(
				(call) => call.type === "master_data.tax_registration.restored.v1",
			),
		).toBe(true);
	});
});
