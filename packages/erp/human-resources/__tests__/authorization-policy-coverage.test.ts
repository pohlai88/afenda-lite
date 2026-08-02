import { describe, expect, it } from "vitest";
import {
	HUMAN_RESOURCES_AUTHORIZATION_POLICIES,
	HumanResourcesAuthorizationPolicyResolveError,
	resolveHumanResourcesAuthorizationPolicy,
} from "../src/kernel/authorization/registry";
import {
	HUMAN_RESOURCES_COMMAND_IDS,
	HUMAN_RESOURCES_QUERY_IDS,
} from "../src/kernel/operations/module-ids";

describe("authorization policy coverage", () => {
	const allOperations = [
		...HUMAN_RESOURCES_COMMAND_IDS,
		...HUMAN_RESOURCES_QUERY_IDS,
	];

	it("resolves slice 8.2 compensation grade and progression operations", () => {
		const operations = [
			"human-resources.compensation-grade.get",
			"human-resources.compensation-grade.list",
			"human-resources.salary-band.get",
			"human-resources.salary-band.list-by-grade",
			"human-resources.salary-band.find-as-of",
			"human-resources.compensation-grade-progression-rule.create",
			"human-resources.compensation-grade-progression-rule.archive",
			"human-resources.compensation-grade-progression-rule.get",
			"human-resources.compensation-grade-progression-rule.list-from-grade",
			"human-resources.compensation-grade-progression-targets.list",
		] as const;
		for (const operationId of operations) {
			const policy = resolveHumanResourcesAuthorizationPolicy(operationId);
			expect(policy.id).toBe("hr.compensation.catalog");
		}
	});

	it("resolves every command and query to exactly one policy", () => {
		const operationCount = allOperations.length;
		expect(operationCount).toBeGreaterThan(0);

		const counts = new Map<string, number>();
		for (const operationId of allOperations) {
			const policy = resolveHumanResourcesAuthorizationPolicy(operationId);
			counts.set(policy.id, (counts.get(policy.id) ?? 0) + 1);
		}

		const classifiedCount = [...counts.values()].reduce(
			(sum, count) => sum + count,
			0,
		);
		expect(classifiedCount).toBe(operationCount);

		for (const policy of HUMAN_RESOURCES_AUTHORIZATION_POLICIES) {
			const count = counts.get(policy.id) ?? 0;
			expect({ policyId: policy.id, count }).toMatchObject({
				count: expect.any(Number),
			});
			expect(count).toBeGreaterThan(0);
		}
	});

	it("has unique exact policy identities", () => {
		const policyIds = HUMAN_RESOURCES_AUTHORIZATION_POLICIES.map(
			(policy) => policy.id,
		);
		expect(new Set(policyIds).size).toBe(policyIds.length);
	});

	it("fails closed with a typed resolve error when unregistered", () => {
		try {
			resolveHumanResourcesAuthorizationPolicy(
				"human-resources.unregistered.operation" as never,
			);
			expect.unreachable("expected resolve to throw");
		} catch (error) {
			expect(error).toBeInstanceOf(
				HumanResourcesAuthorizationPolicyResolveError,
			);
			expect(error).toMatchObject({ code: "policy_not_registered" });
		}
	});
});
