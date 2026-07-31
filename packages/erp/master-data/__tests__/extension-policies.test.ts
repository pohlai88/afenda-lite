import { errorResult, type Result } from "@afenda/errors";
import { describe, expect, it } from "vitest";

import {
	EXTENSION_AGGREGATE_ROOTS,
	type ExtensionAggregateRoot,
	type ItemExtensionRootReader,
	type PartyExtensionRootReader,
	PRIMARY_RECORD_CARDINALITY_POLICY,
	PRIMARY_RECORD_REPLACEMENT_POLICY,
	PRIMARY_RECORD_RESELECT_POLICY,
	PRIMARY_RECORD_SCOPES,
	requireItemExtensionParent,
	requirePartyExtensionParent,
	requirePartyRelationshipParents,
	requireWarehouseExtensionParent,
	type WarehouseExtensionRootReader,
} from "../src/capabilities/extensions";
import { isSameNullablePrimaryScope } from "../src/capabilities/extensions/primary-record-policy";
import { resolveAsync } from "../src/resolve-async";
import type { Item, MasterStatus, Party, Warehouse } from "../src/types";

const now = new Date("2026-01-01T00:00:00.000Z");

function rootBase(status: MasterStatus) {
	return {
		id: "root-1",
		organizationId: "org-a",
		code: "ROOT",
		normalizedCode: "ROOT",
		name: "Root",
		status,
		version: 1,
		createdBy: "user-1",
		updatedBy: "user-1",
		activatedAt: status === "active" ? now : null,
		activatedBy: status === "active" ? "user-1" : null,
		retiredAt: status === "retired" ? now : null,
		retiredBy: status === "retired" ? "user-1" : null,
		createdAt: now,
		updatedAt: now,
	};
}

function party(
	id: string,
	status: MasterStatus,
	mergedIntoId: string | null = null,
): Party {
	return {
		...rootBase(status),
		id,
		partyKind: "organization",
		legalName: null,
		tradingName: null,
		registrationNumber: null,
		registrationCountryId: null,
		preferredLanguageId: null,
		defaultCurrencyId: null,
		mergedIntoId,
		blockedAt: null,
		blockedBy: null,
	};
}

function item(status: MasterStatus): Item {
	return {
		...rootBase(status),
		itemType: "stock",
		baseUomId: "uom-1",
		itemGroupId: "group-1",
	};
}

function _warehouse(status: MasterStatus): Warehouse {
	return {
		...rootBase(status),
		locationType: "warehouse",
		parentId: null,
	};
}

function partyReader(
	rows: Record<string, Party | null>,
): PartyExtensionRootReader {
	return {
		getPartyById(_organizationId, id): Promise<Result<Party | null>> {
			return resolveAsync(() => errorResult.ok(rows[id] ?? null));
		},
	};
}

describe("extension aggregate-root policies", () => {
	it("declares package-wide primary-record replacement semantics", () => {
		expect(PRIMARY_RECORD_REPLACEMENT_POLICY).toBe("atomic_demotion");
		expect(PRIMARY_RECORD_RESELECT_POLICY).toBe("no_op");
		expect(PRIMARY_RECORD_CARDINALITY_POLICY).toBe("zero_or_one");
	});

	it("declares canonical primary-record scopes", () => {
		expect(PRIMARY_RECORD_SCOPES).toEqual({
			partyAddress: ["organizationId", "partyId", "purpose"],
			partyContact: ["organizationId", "partyId", "contactType", "purpose"],
			partyExternalId: [
				"organizationId",
				"partyId",
				"sourceSystem",
				"externalIdType",
			],
			itemBarcode: ["organizationId", "itemId", "uomId"],
			itemExternalId: [
				"organizationId",
				"itemId",
				"sourceSystem",
				"externalIdType",
			],
			itemDefaultPurchaseUom: ["organizationId", "itemId"],
			itemDefaultSalesUom: ["organizationId", "itemId"],
		});
	});

	it("compares nullable primary-scope values with null as an explicit scope", () => {
		expect(isSameNullablePrimaryScope("uom-1", "uom-1")).toBe(true);
		expect(isSameNullablePrimaryScope("uom-1", "uom-2")).toBe(false);
		expect(isSameNullablePrimaryScope<string>(null, null)).toBe(true);
		expect(isSameNullablePrimaryScope("uom-1", null)).toBe(false);
		expect(isSameNullablePrimaryScope(1, 1)).toBe(true);
	});

	it("propagates root reader failures", async () => {
		const reader: ItemExtensionRootReader = {
			getItemById(): Promise<Result<Item | null>> {
				return resolveAsync(() => errorResult.fail("INTERNAL_ERROR"));
			},
		};

		await expect(
			requireItemExtensionParent(reader, "org-a", "item-1"),
		).resolves.toMatchObject({
			ok: false,
			code: "INTERNAL_ERROR",
		});
	});

	it("returns typed missing-parent and invalid-state failures", async () => {
		const missingReader: WarehouseExtensionRootReader = {
			getWarehouseById(): Promise<Result<Warehouse | null>> {
				return resolveAsync(() => errorResult.ok(null));
			},
		};
		await expect(
			requireWarehouseExtensionParent(missingReader, "org-a", "warehouse-1"),
		).resolves.toMatchObject({
			ok: false,
			code: "NOT_FOUND",
		});

		const retiredReader: ItemExtensionRootReader = {
			getItemById(): Promise<Result<Item | null>> {
				return resolveAsync(() => errorResult.ok(item("retired")));
			},
		};
		await expect(
			requireItemExtensionParent(retiredReader, "org-a", "item-1"),
		).resolves.toMatchObject({
			ok: false,
			code: "CONFLICT",
		});
	});

	it("enforces operation-specific parent requirements", async () => {
		const reader: ItemExtensionRootReader = {
			getItemById(): Promise<Result<Item | null>> {
				return resolveAsync(() => errorResult.ok(item("draft")));
			},
		};

		await expect(
			requireItemExtensionParent(reader, "org-a", "item-1", "parent_active"),
		).resolves.toMatchObject({
			ok: false,
			code: "CONFLICT",
		});

		await expect(
			requireItemExtensionParent(reader, "org-a", "item-1", "parent_exists"),
		).resolves.toMatchObject({
			ok: true,
			data: { status: "draft" },
		});
	});

	it("returns merge-specific party parent details", async () => {
		const reader = partyReader({
			"party-1": party("party-1", "active", "party-2"),
		});

		await expect(
			requirePartyExtensionParent(reader, "org-a", "party-1"),
		).resolves.toMatchObject({
			ok: false,
			code: "CONFLICT",
		});
	});

	it("validates both party relationship parents with related-party context", async () => {
		const reader = partyReader({
			"party-1": party("party-1", "active"),
			"party-2": null,
		});

		await expect(
			requirePartyRelationshipParents(reader, "org-a", "party-1", "party-1"),
		).resolves.toMatchObject({
			ok: false,
			code: "BAD_REQUEST",
		});

		await expect(
			requirePartyRelationshipParents(reader, "org-a", "party-1", "party-2"),
		).resolves.toMatchObject({
			ok: false,
			code: "NOT_FOUND",
		});
	});

	it("declares only roots that have a validation policy owner", () => {
		const implementedRoots = new Set<ExtensionAggregateRoot>([
			"party",
			"related_party",
			"item",
			"warehouse",
			"item_template",
			"item_template_attribute",
			"item_variant",
		]);

		for (const roots of Object.values(EXTENSION_AGGREGATE_ROOTS)) {
			for (const root of roots) {
				expect(implementedRoots.has(root)).toBe(true);
			}
		}
	});
});
