import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import {
	assertExpectedVersion,
	evaluateMasterStatus,
	nextMasterVersion,
} from "../src/capabilities/core-organization-masters";
import {
	createEmptyDependencyInspector,
	createUnavailableDependencyInspector,
} from "../src/capabilities/core-organization-masters/dependency";
import {
	assertLifecycleTransition,
	assertRestoreTransition,
	assertTaxRegistrationLifecycleTransition,
} from "../src/capabilities/core-organization-masters/lifecycle";
import {
	MAX_MASTER_CODE_LENGTH,
	normalizeEmail,
	normalizeExternalIdValue,
	normalizeMasterCode,
	normalizePhone,
	normalizeSearchText,
} from "../src/capabilities/core-organization-masters/normalized-code";
import { resolveDependencyInspector } from "../src/command-options";
import {
	assertRestoreTransition as rootAssertRestoreTransition,
	createItem as rootCreateItem,
	createItemTemplate as rootCreateItemTemplate,
	createParty as rootCreateParty,
	createPaymentTerm as rootCreatePaymentTerm,
	createTaxRegistration as rootCreateTaxRegistration,
	createWarehouse as rootCreateWarehouse,
} from "../src/index";

const packageRoot = join(import.meta.dirname, "..");

describe("core organization masters capability", () => {
	it("enforces shared lifecycle usability and version CAS policy", () => {
		expect(evaluateMasterStatus("active")).toEqual({ usable: true });
		expect(evaluateMasterStatus("blocked")).toEqual({
			usable: false,
			reason: "blocked",
		});

		expect(assertExpectedVersion({ id: "party-1", version: 3 }, 3)).toEqual({
			ok: true,
			data: true,
		});
		const conflict = assertExpectedVersion({ id: "party-1", version: 3 }, 2);
		expect(conflict.ok).toBe(false);
		if (!conflict.ok) {
			expect(conflict.details).toMatchObject({
				reason: "MASTER_VERSION_CONFLICT",
				expectedVersion: 2,
				actualVersion: 3,
			});
		}
		expect(nextMasterVersion(3)).toBe(4);
	});

	it("rejects unsafe versions and prevents version overflow", () => {
		for (const expectedVersion of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
			const result = assertExpectedVersion(
				{ id: "party-1", version: 1 },
				expectedVersion,
			);
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.code).toBe("BAD_REQUEST");
				expect(result.details).toMatchObject({
					reason: "MASTER_VALIDATION_FAILED",
					entityId: "party-1",
					expectedVersion,
				});
			}
		}

		expect(() => nextMasterVersion(0)).toThrow(RangeError);
		expect(() => nextMasterVersion(1.5)).toThrow(RangeError);
		expect(() => nextMasterVersion(Number.MAX_SAFE_INTEGER)).toThrow(
			"currentVersion cannot be incremented beyond Number.MAX_SAFE_INTEGER",
		);
	});

	it("normalizes master codes and reports actionable validation details", () => {
		expect(normalizeMasterCode("  Acme_01  ")).toEqual({
			ok: true,
			data: { code: "Acme_01", normalizedCode: "ACME_01" },
		});

		const invalidInputs = [
			Reflect.apply(normalizeMasterCode, undefined, [42]),
			normalizeMasterCode("   "),
			normalizeMasterCode(" acmé "),
		];
		for (const result of invalidInputs) {
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.details).toMatchObject({
					reason: "MASTER_VALIDATION_FAILED",
					field: "code",
				});
			}
		}

		const tooLong = normalizeMasterCode("A".repeat(MAX_MASTER_CODE_LENGTH + 1));
		expect(tooLong.ok).toBe(false);
		if (!tooLong.ok) {
			expect(tooLong.details).toMatchObject({
				reason: "MASTER_VALIDATION_FAILED",
				field: "code",
				maxLength: MAX_MASTER_CODE_LENGTH,
			});
		}
	});

	it("keeps search text, contacts, and external IDs out of master-code folding", () => {
		expect(normalizeSearchText("  Café   Crème  ")).toEqual({
			ok: true,
			data: {
				text: "Café Crème",
				normalizedText: "café crème",
			},
		});
		expect(normalizeEmail(" User.Name@EXAMPLE.COM ")).toEqual({
			ok: true,
			data: {
				value: "User.Name@EXAMPLE.COM",
				normalizedValue: "User.Name@example.com",
			},
		});
		expect(normalizePhone("+60 (12) 345-6789")).toEqual({
			ok: true,
			data: {
				value: "+60 (12) 345-6789",
				normalizedValue: "+60123456789",
			},
		});

		expect(
			normalizeExternalIdValue({
				value: " Acme-42 ",
				caseSensitive: false,
			}),
		).toMatchObject({
			ok: true,
			data: { value: "Acme-42", normalizedValue: "ACME-42" },
		});
		expect(
			normalizeExternalIdValue({
				value: " Acme-42 ",
				caseSensitive: true,
			}),
		).toMatchObject({
			ok: true,
			data: { value: "Acme-42", normalizedValue: "Acme-42" },
		});
	});

	it("fails closed when dependency inspection is not composed", async () => {
		const input = {
			organizationId: "org-a",
			entityType: "item" as const,
			entityId: "item-1",
		};
		await expect(
			createEmptyDependencyInspector().listBlockers(input),
		).resolves.toEqual([]);

		const unavailable = createUnavailableDependencyInspector();
		const expectedBlocker = {
			module: "master-data",
			entityType: "item",
			entityId: "item-1",
			reason: "Dependency inspection is not configured for this operation.",
		};
		await expect(unavailable.listBlockers(input)).resolves.toEqual([
			expectedBlocker,
		]);
		await expect(
			resolveDependencyInspector().listBlockers(input),
		).resolves.toEqual([expectedBlocker]);
	});

	it("keeps restore explicit and supports stronger blocked transitions", () => {
		expect(assertLifecycleTransition("inactive", "blocked")).toEqual({
			ok: true,
			data: true,
		});
		expect(assertLifecycleTransition("blocked", "inactive")).toEqual({
			ok: true,
			data: true,
		});
		expect(assertLifecycleTransition("retired", "draft").ok).toBe(false);
		expect(assertRestoreTransition("retired", "draft")).toEqual({
			ok: true,
			data: true,
		});
		expect(assertRestoreTransition("active", "draft").ok).toBe(false);
		expect(
			assertTaxRegistrationLifecycleTransition("retired", "blocked").ok,
		).toBe(false);
	});

	it("keeps aggregate commands available from the package root", () => {
		expect(rootCreateParty).toBeTypeOf("function");
		expect(rootCreateItem).toBeTypeOf("function");
		expect(rootCreateWarehouse).toBeTypeOf("function");
		expect(rootCreatePaymentTerm).toBeTypeOf("function");
		expect(rootCreateTaxRegistration).toBeTypeOf("function");
		expect(rootCreateItemTemplate).toBeTypeOf("function");
		expect(rootAssertRestoreTransition).toBeTypeOf("function");
	});

	it("has one capability-owned implementation and no root compatibility files", () => {
		const capabilityReadme = readFileSync(
			join(
				packageRoot,
				"src",
				"capabilities",
				"core-organization-masters",
				"README.md",
			),
			"utf8",
		);
		for (const retiredRootFile of [
			"organization-dimension.ts",
			"party.ts",
			"item-group.ts",
			"item.ts",
			"warehouse.ts",
			"payment-term.ts",
			"tax-registration.ts",
			"item-variant.ts",
		]) {
			expect(existsSync(join(packageRoot, "src", retiredRootFile))).toBe(false);
		}

		for (const capabilityFile of [
			"organization-dimension.ts",
			"party.ts",
			"item-group.ts",
			"item.ts",
			"warehouse.ts",
			"payment-term.ts",
			"tax-registration.ts",
			"item-template-variant.ts",
		]) {
			expect(
				existsSync(
					join(
						packageRoot,
						"src",
						"capabilities",
						"core-organization-masters",
						capabilityFile,
					),
				),
			).toBe(true);
			expect(capabilityReadme).toContain(capabilityFile);
		}
		expect(capabilityReadme).not.toContain("template-store.ts");

		const rootBarrel = readFileSync(
			join(packageRoot, "src", "index.ts"),
			"utf8",
		);
		expect(rootBarrel).toContain(
			"./capabilities/core-organization-masters/party",
		);
		expect(rootBarrel).not.toContain('from "./party"');

		const capabilityRoot = join(
			packageRoot,
			"src",
			"capabilities",
			"core-organization-masters",
		);
		expect(
			readdirSync(capabilityRoot, { withFileTypes: true })
				.filter((entry) => entry.isDirectory())
				.map((entry) => entry.name),
		).toEqual([]);
	});
});
