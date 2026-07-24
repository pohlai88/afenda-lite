import { describe, expect, it } from "vitest";

import { parseHumanResourcesLeavePolicyId } from "../src/brands";
import { resolvePublishedLeavePolicyByCodeLineageAsOf } from "../src/leave/leave-policy-lineage";
import type { LeavePolicy } from "../src/types";

const ORG = "org-leave-policy-lineage";

function policy(input: {
	id: string;
	code: string;
	effectiveFrom: string;
	effectiveTo?: string | null;
	supersedesPolicyId?: string | null;
	status?: LeavePolicy["status"];
}): LeavePolicy {
	const id = parseHumanResourcesLeavePolicyId(input.id);
	if (!id.ok) {
		throw new Error("invalid policy id fixture");
	}
	const supersedesPolicyId =
		input.supersedesPolicyId === undefined || input.supersedesPolicyId === null
			? null
			: (() => {
					const parsed = parseHumanResourcesLeavePolicyId(
						input.supersedesPolicyId,
					);
					if (!parsed.ok) throw new Error("invalid supersedes id fixture");
					return parsed.data;
				})();

	return {
		id: id.data,
		organizationId: ORG,
		code: input.code,
		name: input.code,
		leaveType: "annual",
		unit: "day",
		paid: true,
		sensitive: false,
		allowsNegativeBalance: false,
		allowSelfApproval: false,
		allowsPartialDay: true,
		effectiveFrom: input.effectiveFrom,
		effectiveTo: input.effectiveTo ?? null,
		status: input.status ?? "published",
		supersedesPolicyId,
		version: 1,
		createdBy: "tester",
		updatedBy: "tester",
		createdAt: new Date("2026-01-01T00:00:00.000Z"),
		updatedAt: new Date("2026-01-01T00:00:00.000Z"),
	};
}

describe("resolvePublishedLeavePolicyByCodeLineageAsOf", () => {
	it("returns the successor effective on the asOf date", () => {
		const root = policy({
			id: "10000000-0000-4000-8000-000000000001",
			code: "ANNUAL",
			effectiveFrom: "2025-01-01",
			effectiveTo: "2025-06-30",
			status: "superseded",
		});
		const successor = policy({
			id: "10000000-0000-4000-8000-000000000002",
			code: "ANNUAL",
			effectiveFrom: "2025-07-01",
			supersedesPolicyId: root.id,
		});

		const before = resolvePublishedLeavePolicyByCodeLineageAsOf({
			policies: [root, successor],
			code: "ANNUAL",
			asOf: "2025-03-01",
		});
		const after = resolvePublishedLeavePolicyByCodeLineageAsOf({
			policies: [root, successor],
			code: "ANNUAL",
			asOf: "2025-08-01",
		});

		expect(before?.id).toBe(root.id);
		expect(after?.id).toBe(successor.id);
	});

	it("returns null when multiple lineages match the same code", () => {
		const lineageA = policy({
			id: "10000000-0000-4000-8000-000000000011",
			code: "ANNUAL",
			effectiveFrom: "2025-01-01",
		});
		const lineageB = policy({
			id: "10000000-0000-4000-8000-000000000012",
			code: "ANNUAL",
			effectiveFrom: "2025-01-01",
		});

		const resolved = resolvePublishedLeavePolicyByCodeLineageAsOf({
			policies: [lineageA, lineageB],
			code: "ANNUAL",
			asOf: "2025-03-01",
		});

		expect(resolved).toBeNull();
	});

	it("fails closed when a published successor branches", () => {
		const root = policy({
			id: "10000000-0000-4000-8000-000000000021",
			code: "ANNUAL",
			effectiveFrom: "2025-01-01",
			effectiveTo: "2025-06-30",
			status: "superseded",
		});
		const branchA = policy({
			id: "10000000-0000-4000-8000-000000000022",
			code: "ANNUAL",
			effectiveFrom: "2025-07-01",
			supersedesPolicyId: root.id,
		});
		const branchB = policy({
			id: "10000000-0000-4000-8000-000000000023",
			code: "ANNUAL",
			effectiveFrom: "2025-07-01",
			supersedesPolicyId: root.id,
		});

		expect(
			resolvePublishedLeavePolicyByCodeLineageAsOf({
				policies: [root, branchA, branchB],
				code: "ANNUAL",
				asOf: "2025-08-01",
			}),
		).toBeNull();
	});
});
