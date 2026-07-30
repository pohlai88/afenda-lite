import { describe, expect, it } from "vitest";

import {
	assertExtensionTransitionReason,
	assertStandardChildLifecycleStatus,
	EXTENSION_AGGREGATE_ROOTS,
	EXTENSION_LIFECYCLE_FAMILY_BY_KIND,
	EXTENSION_LIFECYCLE_PERMISSION_BY_KIND,
	EXTENSION_LIFECYCLE_TRANSITIONS,
	parseStandardChildLifecycleStatus,
	resolveExtensionLifecycleTransition,
} from "../src/capabilities/extensions";

describe("extension lifecycle policy", () => {
	it("assigns exactly one lifecycle family to every extension kind", () => {
		expect(Object.keys(EXTENSION_LIFECYCLE_FAMILY_BY_KIND).sort()).toEqual(
			Object.keys(EXTENSION_AGGREGATE_ROOTS).sort(),
		);
	});

	it("defines every transition control field", () => {
		for (const transitions of Object.values(EXTENSION_LIFECYCLE_TRANSITIONS)) {
			for (const transition of transitions) {
				expect(transition.expectedVersionRequired).toBe(true);
				expect(transition.parentStateRequirement).toMatch(/^parent_/);
				expect(["allow", "block_when_referenced"]).toContain(
					transition.dependencyBehavior,
				);
				expect(transition.allowedInitiators.length).toBeGreaterThan(0);
				expect(transition.emittedEventAction.length).toBeGreaterThan(0);
				expect(transition.auditAction).toBe("UPDATE");
			}
		}
	});

	it("rejects transitions that are absent from the selected family", () => {
		const result = resolveExtensionLifecycleTransition(
			"party_role",
			"archived",
			"active",
		);
		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect((result.details as { reason?: string }).reason).toBe(
			"MASTER_INVALID_STATE",
		);
		expect((result.details as { extensionKind?: string }).extensionKind).toBe(
			"party_role",
		);
	});

	it("derives lifecycle permission from extension kind", () => {
		expect(EXTENSION_LIFECYCLE_PERMISSION_BY_KIND.party_contact).toBe(
			"master_data.party_contact_manage",
		);
		expect(EXTENSION_LIFECYCLE_PERMISSION_BY_KIND.item_barcode).toBe(
			"master_data.item_extension_manage",
		);
		const resolved = resolveExtensionLifecycleTransition(
			"party_contact",
			"active",
			"inactive",
		);
		expect(resolved).toMatchObject({
			ok: true,
			data: { requiredPermission: "master_data.party_contact_manage" },
		});
	});

	it("requires and normalizes reasons according to transition policy", () => {
		const resolved = resolveExtensionLifecycleTransition(
			"party_role",
			"active",
			"inactive",
		);
		expect(resolved.ok).toBe(true);
		if (!resolved.ok) {
			return;
		}

		expect(assertExtensionTransitionReason(resolved.data, "   ").ok).toBe(
			false,
		);
		expect(
			assertExtensionTransitionReason(resolved.data, "  Duplicate role  "),
		).toEqual({ ok: true, data: "Duplicate role" });
		expect(
			assertExtensionTransitionReason(resolved.data, "x".repeat(1001)).ok,
		).toBe(false);
	});

	it("parses standard child statuses without throwing on untrusted input", () => {
		expect(parseStandardChildLifecycleStatus("active")).toEqual({
			ok: true,
			data: "active",
		});
		expect(parseStandardChildLifecycleStatus("revoked").ok).toBe(false);
		expect(() => assertStandardChildLifecycleStatus("revoked")).toThrow(
			"Invalid standard child lifecycle status: revoked",
		);
	});

	it("allows system-driven identity registration expiry", () => {
		const resolved = resolveExtensionLifecycleTransition(
			"party_external_id",
			"active",
			"expired",
		);
		expect(resolved).toMatchObject({
			ok: true,
			data: {
				reasonRequired: false,
				parentStateRequirement: "parent_exists",
				allowedInitiators: ["operator", "system"],
			},
		});
	});
});
