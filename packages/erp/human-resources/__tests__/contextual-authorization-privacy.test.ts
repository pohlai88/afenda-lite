import { fail, ok } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";

import type {
	HumanResourcesEmployeeId,
	HumanResourcesPermission,
} from "../src";
import {
	applyResourceFieldProjection,
	authorizeHumanResourcesSensitiveResource,
	HUMAN_RESOURCES_ACTOR_SCOPES,
	HUMAN_RESOURCES_RETENTION_CLASSIFICATIONS,
	HUMAN_RESOURCES_RETENTION_POLICIES,
	HUMAN_RESOURCES_SENSITIVE_RESOURCE_POLICIES,
	HUMAN_RESOURCES_SENSITIVE_RESOURCE_TYPES,
	humanResourcesSensitiveOperationPolicy,
} from "../src";
import {
	HUMAN_RESOURCES_COMMAND_IDS,
	HUMAN_RESOURCES_QUERY_IDS,
} from "../src/module-ids";

const employeeId =
	"550e8400-e29b-41d4-a716-446655440000" as HumanResourcesEmployeeId;

function baseInput() {
	return {
		organizationId: "org-1",
		resourceOrganizationId: "org-1",
		actorUserId: "user-1",
		actorEmployeeId: employeeId,
		actorEmploymentStatus: "active" as const,
		directScopes: ["subject"] as const,
		resourceType: "personal_identifiers" as const,
		resourceId: "resource-1",
		subjectEmployeeId: employeeId,
		action: "read" as const,
		asOf: "2026-07-24",
	};
}

describe("HR-ENT-04 contextual authorization", () => {
	it("has an explicit policy for every governed actor scope and sensitive resource", () => {
		expect(HUMAN_RESOURCES_ACTOR_SCOPES).toEqual([
			"subject",
			"manager",
			"matrix_manager",
			"hr_business_partner",
			"recruiter",
			"compensation",
			"benefits",
			"investigator",
			"legal_compliance",
			"executive_planner",
			"integration",
		]);
		expect(
			Object.keys(HUMAN_RESOURCES_SENSITIVE_RESOURCE_POLICIES).sort(),
		).toEqual([...HUMAN_RESOURCES_SENSITIVE_RESOURCE_TYPES].sort());
		for (const policy of Object.values(
			HUMAN_RESOURCES_SENSITIVE_RESOURCE_POLICIES,
		)) {
			expect(policy.allowedScopes.length).toBeGreaterThan(0);
			expect(policy.fieldClasses.length).toBeGreaterThan(0);
		}
	});

	it("classifies the complete sensitive command/query surface", () => {
		const commandPolicies = HUMAN_RESOURCES_COMMAND_IDS.flatMap((operation) => {
			const policy = humanResourcesSensitiveOperationPolicy(operation);
			return policy ? [{ operation, policy }] : [];
		});
		const queryPolicies = HUMAN_RESOURCES_QUERY_IDS.flatMap((operation) => {
			const policy = humanResourcesSensitiveOperationPolicy(operation);
			return policy ? [{ operation, policy }] : [];
		});

		expect(commandPolicies).toHaveLength(123);
		expect(queryPolicies).toHaveLength(47);
		for (const { policy } of [...commandPolicies, ...queryPolicies]) {
			expect(policy.subjectPolicy).toMatch(
				/^(subject|manager|assigned)_or_privileged$|^privileged_only$/,
			);
			expect(policy.fieldClasses.length).toBeGreaterThan(0);
			expect(HUMAN_RESOURCES_SENSITIVE_RESOURCE_TYPES).toContain(
				policy.resourceType,
			);
		}
	});

	it("allows subject access only to the authenticated subject", async () => {
		await expect(
			authorizeHumanResourcesSensitiveResource(baseInput()),
		).resolves.toMatchObject({ ok: true, data: { allowedScope: "subject" } });
		await expect(
			authorizeHumanResourcesSensitiveResource({
				...baseInput(),
				subjectEmployeeId:
					"6ba7b810-9dad-11d1-80b4-00c04fd430c8" as HumanResourcesEmployeeId,
			}),
		).resolves.toMatchObject({ ok: false, code: "FORBIDDEN" });
	});

	it("denies cross-tenant references before evaluating scopes", async () => {
		const result = await authorizeHumanResourcesSensitiveResource({
			...baseInput(),
			resourceOrganizationId: "org-2",
			directScopes: ["legal_compliance"],
		});
		expect(result).toMatchObject({
			ok: false,
			code: "FORBIDDEN",
			message: "Cross-tenant human resources access denied",
		});
	});

	it("revokes terminated actors even when they retain a privileged scope", async () => {
		const result = await authorizeHumanResourcesSensitiveResource({
			...baseInput(),
			actorEmploymentStatus: "terminated",
			directScopes: ["legal_compliance"],
		});
		expect(result).toMatchObject({ ok: false, code: "UNAUTHORIZED" });
	});

	it("honours delegated authority only inside its effective dates", async () => {
		const delegation = {
			scope: "compensation" as const,
			validFrom: "2026-07-01",
			validUntil: "2026-07-31",
			delegatedByUserId: "user-delegator",
		};
		const input = {
			...baseInput(),
			directScopes: [] as const,
			resourceType: "compensation" as const,
			delegatedAuthorities: [delegation],
		};
		await expect(
			authorizeHumanResourcesSensitiveResource(input),
		).resolves.toMatchObject({
			ok: true,
			data: { allowedScope: "compensation" },
		});
		await expect(
			authorizeHumanResourcesSensitiveResource({
				...input,
				asOf: "2026-08-01",
			}),
		).resolves.toMatchObject({ ok: false, code: "FORBIDDEN" });
	});

	it("prevents self-approval and conflicting duties", async () => {
		await expect(
			authorizeHumanResourcesSensitiveResource({
				...baseInput(),
				resourceType: "compensation",
				directScopes: ["compensation"],
				action: "approve",
				ownerActorUserId: "user-1",
			}),
		).resolves.toMatchObject({
			ok: false,
			message: "Self-approval is not permitted",
		});
		await expect(
			authorizeHumanResourcesSensitiveResource({
				...baseInput(),
				resourceType: "employee_relations",
				directScopes: ["investigator"],
				actorDuties: ["case_investigate"],
				requestedDuty: "case_approve_action",
			}),
		).resolves.toMatchObject({
			ok: false,
			message: "Separation of duties policy denied access",
		});
	});

	it("requires a specific reason and durable audit evidence for break-glass access", async () => {
		const records: unknown[] = [];
		const audit = {
			async record(input: unknown) {
				records.push(input);
				return ok({ id: "break-glass-1" });
			},
		};
		const input = {
			...baseInput(),
			directScopes: [] as const,
			resourceType: "employee_relations" as const,
			breakGlass: {
				reason: "Urgent legal preservation order",
				correlationId: "corr-1",
				audit,
			},
		};
		await expect(
			authorizeHumanResourcesSensitiveResource(input),
		).resolves.toMatchObject({
			ok: true,
			data: {
				allowedScope: "break_glass",
				breakGlassAuditId: "break-glass-1",
			},
		});
		expect(records).toHaveLength(1);

		await expect(
			authorizeHumanResourcesSensitiveResource({
				...input,
				breakGlass: { ...input.breakGlass, reason: "urgent" },
			}),
		).resolves.toMatchObject({ ok: false, code: "VALIDATION_ERROR" });

		await expect(
			authorizeHumanResourcesSensitiveResource({
				...input,
				breakGlass: {
					...input.breakGlass,
					audit: {
						async record() {
							return fail("INTERNAL_ERROR", "Audit unavailable");
						},
					},
				},
			}),
		).resolves.toMatchObject({ ok: false, code: "INTERNAL_ERROR" });
	});
});

describe("HR-ENT-04 field privacy and retention", () => {
	it("redacts every governed field class unless its explicit permission is present", () => {
		const source = {
			displayName: "Person",
			ssn: "secret",
			medicalDetails: "secret",
			baseAmount: 100,
			evidence: "secret",
			backgroundCheckResult: "clear",
			readinessLevel: "ready-now",
		};
		const projected = applyResourceFieldProjection(source, {
			resourceType: "background_check",
			fieldClasses: [
				"personal_identifiers",
				"medical",
				"compensation",
				"employee_relations_evidence",
				"background_check",
				"succession",
			],
			actorPermissions: new Set<HumanResourcesPermission>(),
		});
		expect(projected.data).toEqual({ displayName: "Person" });
		expect(projected.redactedFields.sort()).toEqual(
			[
				"ssn",
				"medicalDetails",
				"baseAmount",
				"evidence",
				"backgroundCheckResult",
				"readinessLevel",
			].sort(),
		);
	});

	it("reveals only field classes covered by explicit permissions", () => {
		const projected = applyResourceFieldProjection(
			{ baseAmount: 100, readinessLevel: "ready-now", ssn: "secret" },
			{
				resourceType: "succession",
				fieldClasses: ["compensation", "succession", "personal_identifiers"],
				actorPermissions: new Set<HumanResourcesPermission>([
					"human-resources.compensation.read",
					"human-resources.succession.executive.read",
				]),
			},
		);
		expect(projected.data).toEqual({
			baseAmount: 100,
			readinessLevel: "ready-now",
		});
		expect(projected.redactedFields).toEqual(["ssn"]);
	});

	it("defines complete legal-hold-aware retention metadata", () => {
		expect(Object.keys(HUMAN_RESOURCES_RETENTION_POLICIES).sort()).toEqual(
			[...HUMAN_RESOURCES_RETENTION_CLASSIFICATIONS].sort(),
		);
		for (const policy of Object.values(HUMAN_RESOURCES_RETENTION_POLICIES)) {
			expect(policy.minimumRetentionMonths).toBeGreaterThan(0);
			expect(policy.legalHoldEligible).toBe(true);
		}
	});
});
