import { fail, ok } from "@afenda/errors/result";
import { describe, expect, it, vi } from "vitest";

import type { HumanResourcesAuthorizationPort } from "../src/authorization";
import type { HumanResourcesQueryId } from "../src/module-ids";
import {
	HUMAN_RESOURCES_COMMAND_DEPARTMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CREATE_DRAFT,
	HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_GET,
} from "../src/module-ids";
import {
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
			return permissions.has(input.permission);
		},
	};
}

describe("runAuthorizedHumanResourcesOperation", () => {
	it("denies when the actor lacks the required permission", async () => {
		const execute = vi.fn(async () => ok({ id: "x" }));
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
			},
			execute: async () => ok({ created: true }),
		});

		expect(result).toEqual(ok({ created: true }));
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
			execute: async () => ok({ id: "leave-1", status: "draft" }),
			project,
		});

		expect(result).toEqual(
			ok({ id: "leave-1", status: "draft", masked: true }),
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
			execute: async () => ok({ ok: true }),
		});

		expect(resolveResource).toHaveBeenCalledOnce();
		expect(result.ok).toBe(true);
	});
});

const EMPLOYEE_COMPENSATION_GET =
	"human-resources.employee-compensation.get" as HumanResourcesQueryId;

describe("runAuthorizedHumanResourcesOperation cross-tenant enforcement", () => {
	it("denies a cross-tenant resource before execution", async () => {
		const execute = vi.fn(async () => ok({ id: "comp-1" }));

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
			execute: async () => ok({ drafted: true }),
		});

		expect(result).toEqual(ok({ drafted: true }));
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
			expect(result.details).toMatchObject({
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
				authorization: grantingAuthorization(
					new Set([HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE]),
				),
			},
			execute: async () => fail("CONFLICT", "boom"),
			project,
		});

		expect(result).toEqual(fail("CONFLICT", "boom"));
		expect(project).not.toHaveBeenCalled();
	});
});
