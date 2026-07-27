import { describe, expect, it } from "vitest";

import {
	evaluateItemVariantUsability,
	evaluateMasterStatus,
	evaluatePartyUsability,
	evaluateTaxRegistrationUsability,
	isWarehouseParentTypeCompatible,
} from "../src/capabilities/core-organization-masters/core-master-policy";
import type {
	Item,
	ItemVariant,
	MasterStatus,
	Party,
	TaxRegistration,
} from "../src/types";

const NOW = new Date("2026-07-27T00:00:00.000Z");

function masterBase(status: MasterStatus) {
	return {
		id: "master-1",
		organizationId: "org-a",
		code: "MASTER-1",
		normalizedCode: "MASTER-1",
		name: "Master 1",
		status,
		version: 1,
		createdBy: "user-1",
		updatedBy: "user-1",
		activatedAt: status === "active" ? NOW : null,
		activatedBy: status === "active" ? "user-1" : null,
		retiredAt: status === "retired" ? NOW : null,
		retiredBy: status === "retired" ? "user-1" : null,
		createdAt: NOW,
		updatedAt: NOW,
	};
}

function party(status: MasterStatus, mergedIntoId: string | null): Party {
	return {
		...masterBase(status),
		partyKind: "organization",
		legalName: null,
		tradingName: null,
		registrationNumber: null,
		registrationCountryId: null,
		preferredLanguageId: null,
		defaultCurrencyId: null,
		mergedIntoId,
		blockedAt: status === "blocked" ? NOW : null,
		blockedBy: status === "blocked" ? "user-1" : null,
	};
}

function item(status: MasterStatus): Item {
	return {
		...masterBase(status),
		itemType: "stock",
		baseUomId: "uom-1",
		itemGroupId: "group-1",
	};
}

function registration(input: {
	status: MasterStatus;
	validFrom?: Date | null;
	validTo?: Date | null;
}): TaxRegistration {
	return {
		id: "registration-1",
		organizationId: "org-a",
		partyId: "party-1",
		jurisdictionCountryId: "country-1",
		registrationType: "vat_gst",
		registrationNumber: "VAT-1",
		normalizedRegistrationNumber: "VAT-1",
		name: null,
		status: input.status,
		version: 1,
		validFrom: input.validFrom ?? null,
		validTo: input.validTo ?? null,
		createdBy: "user-1",
		updatedBy: "user-1",
		activatedAt: input.status === "active" ? NOW : null,
		activatedBy: input.status === "active" ? "user-1" : null,
		blockedAt: input.status === "blocked" ? NOW : null,
		blockedBy: input.status === "blocked" ? "user-1" : null,
		retiredAt: input.status === "retired" ? NOW : null,
		retiredBy: input.status === "retired" ? "user-1" : null,
		deletedAt: null,
		deletedBy: null,
		createdAt: NOW,
		updatedAt: NOW,
	};
}

function variant(status: MasterStatus, retiredAt: Date | null): ItemVariant {
	return {
		id: "variant-1",
		organizationId: "org-a",
		itemId: "item-1",
		templateId: "template-1",
		combinationKey: "COLOR=RED",
		version: 1,
		createdBy: "user-1",
		updatedBy: "user-1",
		retiredAt,
		retiredBy: retiredAt === null ? null : "user-1",
		createdAt: NOW,
		updatedAt: NOW,
		item: item(status),
		values: [],
	};
}

describe("core master usability policy", () => {
	it("allows skipped warehouse levels but rejects same-level and upward nesting", () => {
		expect(isWarehouseParentTypeCompatible("site", "warehouse")).toBe(true);
		expect(isWarehouseParentTypeCompatible("site", "bin")).toBe(true);
		expect(isWarehouseParentTypeCompatible("warehouse", "zone")).toBe(true);
		expect(isWarehouseParentTypeCompatible("warehouse", "warehouse")).toBe(
			false,
		);
		expect(isWarehouseParentTypeCompatible("zone", "site")).toBe(false);
		expect(isWarehouseParentTypeCompatible("bin", "rack")).toBe(false);
	});

	it("maps lifecycle states to base operational usability", () => {
		expect(evaluateMasterStatus("active")).toEqual({ usable: true });
		for (const status of ["draft", "inactive"] as const) {
			expect(evaluateMasterStatus(status)).toEqual({
				usable: false,
				reason: "not_active",
			});
		}
		expect(evaluateMasterStatus("blocked")).toEqual({
			usable: false,
			reason: "blocked",
		});
		expect(evaluateMasterStatus("retired")).toEqual({
			usable: false,
			reason: "retired",
		});
	});

	it("gives party merge precedence over lifecycle status", () => {
		expect(evaluatePartyUsability(party("active", null))).toEqual({
			usable: true,
		});
		expect(evaluatePartyUsability(party("active", "party-2"))).toEqual({
			usable: false,
			reason: "merged",
		});
		expect(evaluatePartyUsability(party("retired", "party-2"))).toEqual({
			usable: false,
			reason: "merged",
		});
	});

	it("treats tax-registration validity bounds as inclusive", () => {
		const validFrom = new Date("2026-07-01T00:00:00.000Z");
		const validTo = new Date("2026-07-31T00:00:00.000Z");
		const active = registration({ status: "active", validFrom, validTo });

		expect(
			evaluateTaxRegistrationUsability(registration({ status: "active" }), NOW),
		).toEqual({ usable: true });
		expect(
			evaluateTaxRegistrationUsability(
				active,
				new Date("2026-06-30T00:00:00.000Z"),
			),
		).toEqual({ usable: false, reason: "not_yet_valid" });
		expect(evaluateTaxRegistrationUsability(active, validFrom)).toEqual({
			usable: true,
		});
		expect(evaluateTaxRegistrationUsability(active, NOW)).toEqual({
			usable: true,
		});
		expect(evaluateTaxRegistrationUsability(active, validTo)).toEqual({
			usable: true,
		});
		expect(
			evaluateTaxRegistrationUsability(
				active,
				new Date("2026-08-01T00:00:00.000Z"),
			),
		).toEqual({ usable: false, reason: "expired" });
		expect(
			evaluateTaxRegistrationUsability(
				registration({ status: "blocked", validFrom, validTo }),
				NOW,
			),
		).toEqual({ usable: false, reason: "blocked" });
		expect(
			evaluateTaxRegistrationUsability(
				registration({ status: "retired", validFrom, validTo }),
				NOW,
			),
		).toEqual({ usable: false, reason: "retired" });
	});

	it("derives variant usability from retirement and its operational item", () => {
		expect(evaluateItemVariantUsability(variant("active", NOW))).toEqual({
			usable: false,
			reason: "retired",
		});
		expect(evaluateItemVariantUsability(variant("active", null))).toEqual({
			usable: true,
		});
		expect(evaluateItemVariantUsability(variant("inactive", null))).toEqual({
			usable: false,
			reason: "not_active",
		});
		expect(evaluateItemVariantUsability(variant("retired", null))).toEqual({
			usable: false,
			reason: "retired",
		});
	});
});
