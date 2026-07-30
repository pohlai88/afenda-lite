import { describe, expect, it } from "vitest";

import {
	HUMAN_RESOURCES_COMMAND_IDS,
	HUMAN_RESOURCES_QUERY_IDS,
} from "../src/module-ids";
import {
	HUMAN_RESOURCES_AUTHORIZATION_POLICIES,
	HumanResourcesAuthorizationPolicyResolveError,
	resolveHumanResourcesAuthorizationPolicy,
} from "../src/shared/authorization-policy-registry";

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
			expect(policy.id).toBe("hr.compensation");
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

	it("has no overlapping operationPrefixes across catalog policies", () => {
		const policies = [...HUMAN_RESOURCES_AUTHORIZATION_POLICIES];
		for (let i = 0; i < policies.length; i += 1) {
			const left = policies[i];
			if (left === undefined) {
				continue;
			}
			for (let j = i + 1; j < policies.length; j += 1) {
				const right = policies[j];
				if (right === undefined) {
					continue;
				}
				for (const leftPrefix of left.operationPrefixes) {
					for (const rightPrefix of right.operationPrefixes) {
						const overlaps =
							leftPrefix.startsWith(rightPrefix) ||
							rightPrefix.startsWith(leftPrefix);
						expect({
							left: left.id,
							right: right.id,
							leftPrefix,
							rightPrefix,
							overlaps,
						}).toMatchObject({ overlaps: false });
					}
				}
			}
		}
	}, 15_000);

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
