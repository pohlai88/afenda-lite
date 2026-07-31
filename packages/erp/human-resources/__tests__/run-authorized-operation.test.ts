import { errorResult } from "@afenda/errors";
import { describe, expect, it, vi } from "vitest";

import type { HumanResourcesAuthorizationPort } from "../src/authorization";
import type { HumanResourcesQueryId } from "../src/module-ids";
import {
	HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_CREATE,
	HUMAN_RESOURCES_COMMAND_DEPARTMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CREATE_DRAFT,
	HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_GET,
} from "../src/module-ids";
import {
	createMemoryHrObservabilityRecorder,
	type HrObservabilityPorts,
} from "../src/observability";
import {
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN,
	HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE,
} from "../src/permissions";
import type { HumanResourcesFieldProjection } from "../src/shared/authorization-types";
import {
	authorizationDecisionToFailure,
	createParityResourceShell,
	runAuthorizedHumanResourcesOperation,
	runDomainAuthorizedOperation,
} from "../src/shared/run-authorized-operation";

function grantingAuthorization(
	permissions: ReadonlySet<string>,
): HumanResourcesAuthorizationPort {
	return {
		async can(input) {
			return await permissions.has(input.permission);
		},
	};
}

function observabilityHarness(): {
	ports: HrObservabilityPorts;
	recorder: ReturnType<typeof createMemoryHrObservabilityRecorder>;
} {
	const recorder = createMemoryHrObservabilityRecorder();
	return {
		recorder,
		ports: {
			recorder,
			clock: { now: () => new Date("2026-07-28T00:00:00.000Z") },
		},
	};
}

describe("runAuthorizedHumanResourcesOperation", () => {
	it("denies when the actor lacks the required permission", async () => {
		const execute = vi.fn(async () => errorResult.ok({ id: "x" }));
		const result = await runAuthorizedHumanResourcesOperation({
			operationId: HUMAN_RESOURCES_COMMAND_DEPARTMENT_CREATE,
			operationKind: "command",
			requiredPermission: HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE,
			input: {
				organizationId: "org-1",
				actorUserId: "user-1",
				correlationId: "corr-1",
			},
			options: {
				authorization: grantingAuthorization(new Set()),
			},
			execute,
		});

		expect(result.ok).toBe(false);
		expect(execute).not.toHaveBeenCalled();
	});

	it("executes when authorization allows", async () => {
		const telemetry = observabilityHarness();
		const result = await runAuthorizedHumanResourcesOperation({
			operationId: HUMAN_RESOURCES_COMMAND_COMPENSATION_GRADE_CREATE,
			operationKind: "command",
			requiredPermission: HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
			input: {
				organizationId: "org-1",
				actorUserId: "user-1",
				correlationId: "corr-1",
			},
			options: {
				observability: telemetry.ports,
				authorization: grantingAuthorization(
					new Set([HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE]),
				),
			},
			resolveResource: async () =>
				createParityResourceShell({
					organizationId: "org-1",
					kind: "compensation",
				}),
			execute: async () => errorResult.ok({ created: true }),
		});

		expect(result).toEqual(errorResult.ok({ created: true }));
		expect(telemetry.recorder.metrics).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: "hr.command.total",
					labels: { area: "compensation", outcome: "success" },
				}),
			]),
		);
	});

	it("records bounded command and authorization-denial telemetry", async () => {
		const telemetry = observabilityHarness();
		const result = await runAuthorizedHumanResourcesOperation({
			operationId: HUMAN_RESOURCES_COMMAND_DEPARTMENT_CREATE,
			operationKind: "command",
			requiredPermission: HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE,
			input: {
				organizationId: "org-sensitive-1",
				actorUserId: "user-sensitive-1",
				correlationId: "corr-sensitive-1",
			},
			options: {
				observability: telemetry.ports,
				authorization: grantingAuthorization(new Set()),
			},
			execute: async () => errorResult.ok({ created: true }),
		});

		expect(result).toMatchObject({ ok: false, code: "FORBIDDEN" });
		expect(telemetry.recorder.metrics).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: "hr.authorization.denial.total",
					labels: { area: "workforce", reason: "permission_missing" },
				}),
				expect.objectContaining({
					name: "hr.command.total",
					labels: { area: "workforce", outcome: "failure" },
				}),
			]),
		);
		const serialized = JSON.stringify(telemetry.recorder);
		expect(serialized).not.toContain("org-sensitive-1");
		expect(serialized).not.toContain("user-sensitive-1");
		expect(serialized).not.toContain("corr-sensitive-1");
	});

	it("applies project using the authorization decision projection", async () => {
		const project = vi.fn(
			(
				value: { id: string; status: string },
				decisionProjection: HumanResourcesFieldProjection | undefined,
			) => ({
				...value,
				masked: decisionProjection === undefined,
			}),
		);
		const result = await runAuthorizedHumanResourcesOperation({
			operationId: HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_GET,
			operationKind: "query",
			requiredPermission: HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN,
			input: {
				organizationId: "org-1",
				actorUserId: "user-1",
				actorEmployeeId: "employee-1",
				correlationId: "corr-1",
			},
			options: {
				authorization: grantingAuthorization(
					new Set([HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN]),
				),
			},
			resolveResource: async () => ({
				organizationId: "org-1",
				kind: "leave_request",
				resourceId: "leave-1",
				subjectEmployeeId: "employee-1",
			}),
			execute: async () => errorResult.ok({ id: "leave-1", status: "draft" }),
			project,
		});

		expect(result).toEqual(
			errorResult.ok({ id: "leave-1", status: "draft", masked: true }),
		);
		expect(project).toHaveBeenCalledOnce();
	});

	it("invokes resolveResource before authorize", async () => {
		const resolveResource = vi.fn(async () =>
			createParityResourceShell({
				organizationId: "org-1",
				kind: "leave_request",
			}),
		);
		const result = await runAuthorizedHumanResourcesOperation({
			operationId: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CREATE_DRAFT,
			operationKind: "command",
			requiredPermission: HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN,
			input: {
				organizationId: "org-1",
				actorUserId: "user-1",
				correlationId: "corr-1",
			},
			options: {
				authorization: grantingAuthorization(
					new Set([HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN]),
				),
			},
			resolveResource,
			execute: async () => errorResult.ok({ ok: true }),
		});

		expect(resolveResource).toHaveBeenCalledOnce();
		expect(result.ok).toBe(true);
	});
});

const EMPLOYEE_COMPENSATION_GET =
	"human-resources.employee-compensation.get" as HumanResourcesQueryId;

describe("runAuthorizedHumanResourcesOperation cross-tenant enforcement", () => {
	it("denies a cross-tenant resource before execution", async () => {
		const telemetry = observabilityHarness();
		const execute = vi.fn(async () => errorResult.ok({ id: "comp-1" }));

		const result = await runAuthorizedHumanResourcesOperation({
			operationId: EMPLOYEE_COMPENSATION_GET,
			operationKind: "query",
			requiredPermission: HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
			input: {
				organizationId: "org-a",
				actorUserId: "user-1",
				correlationId: "corr-1",
			},
			options: {
				observability: telemetry.ports,
				authorization: grantingAuthorization(
					new Set([HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ]),
				),
			},
			resolveResource: async () => ({
				organizationId: "org-b",
				kind: "compensation",
				resourceId: "comp-1",
				subjectEmployeeId: "employee-1",
			}),
			execute,
		});

		expect(result.ok).toBe(false);
		expect(execute).not.toHaveBeenCalled();
		expect(telemetry.recorder.metrics).toContainEqual({
			name: "hr.authorization.denial.total",
			kind: "counter",
			value: 1,
			labels: { area: "compensation", reason: "tenant_mismatch" },
		});
		expect(
			telemetry.recorder.metrics.some(
				(metric) => metric.name === "hr.command.total",
			),
		).toBe(false);
	});
});

describe("runDomainAuthorizedOperation", () => {
	it("supplies a parity resource shell when the policy requires resource context", async () => {
		const result = await runDomainAuthorizedOperation({
			operationId: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CREATE_DRAFT,
			operationKind: "command",
			data: {
				organizationId: "org-1",
				actorUserId: "user-1",
				correlationId: "corr-1",
			},
			options: {
				authorization: grantingAuthorization(
					new Set([HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN]),
				),
			},
			parityResourceKind: "leave_request",
			execute: async () => errorResult.ok({ drafted: true }),
		});

		expect(result).toEqual(errorResult.ok({ drafted: true }));
	});
});

describe("authorizationDecisionToFailure", () => {
	it("maps a denied decision to a FORBIDDEN result", () => {
		const result = authorizationDecisionToFailure(
			{
				allowed: false,
				code: "subject_scope_denied",
				reason: "out of scope",
				policyId: "hr.leave",
			},
			HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CREATE_DRAFT,
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("FORBIDDEN");
			expect(errorResult.context(result)).toMatchObject({
				denyCode: "subject_scope_denied",
				policyId: "hr.leave",
				operationId: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CREATE_DRAFT,
			});
		}
	});
});

describe("createParityResourceShell", () => {
	it("marks the resource as privileged for transitional runner parity", () => {
		expect(
			createParityResourceShell({
				organizationId: "org-1",
				kind: "timesheet",
			}),
		).toEqual({
			organizationId: "org-1",
			kind: "timesheet",
			attributes: { privilegedActor: true },
		});
	});
});

describe("runAuthorizedHumanResourcesOperation execute failures", () => {
	it("returns execute failures without projecting", async () => {
		const telemetry = observabilityHarness();
		const project = vi.fn();
		const result = await runAuthorizedHumanResourcesOperation({
			operationId: HUMAN_RESOURCES_COMMAND_DEPARTMENT_CREATE,
			operationKind: "command",
			requiredPermission: HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE,
			input: {
				organizationId: "org-1",
				actorUserId: "user-1",
				correlationId: "corr-1",
			},
			options: {
				observability: telemetry.ports,
				authorization: grantingAuthorization(
					new Set([HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE]),
				),
			},
			execute: async () =>
				errorResult.fail("CONFLICT", { publicMessage: "boom" }),
			project,
		});

		expect(result).toEqual(
			errorResult.fail("CONFLICT", { publicMessage: "boom" }),
		);
		expect(project).not.toHaveBeenCalled();
		expect(telemetry.recorder.events).toContainEqual({
			name: "hr.command.failed",
			severity: "error",
			observedAt: new Date("2026-07-28T00:00:00.000Z"),
			attributes: { area: "workforce", reason: "conflict" },
		});
	});

	it("preserves domain results when the telemetry recorder fails", async () => {
		const result = await runAuthorizedHumanResourcesOperation({
			operationId: HUMAN_RESOURCES_COMMAND_DEPARTMENT_CREATE,
			operationKind: "command",
			requiredPermission: HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE,
			input: {
				organizationId: "org-1",
				actorUserId: "user-1",
				correlationId: "corr-1",
			},
			options: {
				authorization: grantingAuthorization(
					new Set([HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE]),
				),
				observability: {
					clock: { now: () => new Date() },
					recorder: {
						recordMetric: () => {
							throw new Error("telemetry unavailable");
						},
						recordEvent: () => {
							throw new Error("telemetry unavailable");
						},
					},
				},
			},
			execute: async () => errorResult.ok({ created: true }),
		});

		expect(result).toEqual(errorResult.ok({ created: true }));
	});
});
