import { describe, expect, it } from "vitest";
import type { HumanResourcesAuthorizationRequest } from "../src/kernel/authorization/authorization-types";
import type { HumanResourcesAuthorizationPort } from "../src/kernel/authorization/authorize";
import { authorizeHumanResourcesOperation } from "../src/kernel/authorization/contextual-authorization";
import {
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN,
	HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_SENSITIVE_READ,
	HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE,
} from "../src/kernel/authorization/permissions";
import {
	HUMAN_RESOURCES_MANIFEST_ONLY_POLICY_ID,
	type HumanResourcesAuthorizationPolicy,
	resolveHumanResourcesAuthorizationPolicy,
} from "../src/kernel/authorization/registry";
import { HUMAN_RESOURCES_SENSITIVE_OPERATION_IDS } from "../src/kernel/authorization/sensitive-operation-policies";
import {
	HUMAN_RESOURCES_ERROR_AUTHORIZATION_DENIED,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
} from "../src/kernel/execution/error-codes";
import {
	HUMAN_RESOURCES_COMMAND_DEPARTMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CREATE_DRAFT,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_GET,
	HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_GET,
} from "../src/kernel/operations/module-ids";
import { helperAssert as assert } from "./helpers/helper-assert";
import { humanResourcesContextFromResult } from "./helpers/result-details";

function grantingAuthorization(
	permissions: ReadonlySet<string>,
): HumanResourcesAuthorizationPort {
	return {
		async can(input) {
			return await permissions.has(input.permission);
		},
	};
}

const leaveOwnAuth = () =>
	grantingAuthorization(
		new Set([HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN]),
	);

function baseActor(
	overrides?: Partial<HumanResourcesAuthorizationRequest["actor"]>,
): HumanResourcesAuthorizationRequest["actor"] {
	return {
		organizationId: "org-1",
		actorUserId: "user-1",
		actorEmployeeId: "employee-1",
		correlationId: "corr-1",
		...overrides,
	};
}

function leaveResource(
	overrides?: Partial<
		NonNullable<HumanResourcesAuthorizationRequest["resource"]>
	>,
): NonNullable<HumanResourcesAuthorizationRequest["resource"]> {
	return {
		organizationId: "org-1",
		kind: "leave_request",
		resourceId: "leave-1",
		subjectEmployeeId: "employee-1",
		...overrides,
	};
}

function leaveCommandRequest(
	overrides?: Partial<HumanResourcesAuthorizationRequest>,
): HumanResourcesAuthorizationRequest {
	return {
		operationId: HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CREATE_DRAFT,
		operationKind: "command",
		requiredPermission: HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN,
		actor: baseActor(),
		resource: leaveResource(),
		...overrides,
	};
}

function leaveQueryRequest(
	overrides?: Partial<HumanResourcesAuthorizationRequest>,
): HumanResourcesAuthorizationRequest {
	return {
		operationId: HUMAN_RESOURCES_QUERY_LEAVE_REQUEST_GET,
		operationKind: "query",
		requiredPermission: HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN,
		actor: baseActor(),
		resource: leaveResource(),
		requestedFields: ["status", "medicalDetails", "note"],
		...overrides,
	};
}

function stubPolicy(
	overrides: Partial<HumanResourcesAuthorizationPolicy> &
		Pick<HumanResourcesAuthorizationPolicy, "id">,
): HumanResourcesAuthorizationPolicy {
	return {
		mode: "subject_scoped",
		resourceRequired: true,
		async evaluate() {
			return await { allowed: true, policyId: overrides.id };
		},
		...overrides,
	};
}

function expectAuthorizationDenied(
	result: Awaited<ReturnType<typeof authorizeHumanResourcesOperation>>,
	denyCode: string,
) {
	assert.strictEqual(result.ok, false);
	if (result.ok) {
		return;
	}
	assert.strictEqual(result.code, "FORBIDDEN");
	assert.doesNotMatch(result.message, /manager|case membership|investigator/i);
	assert.deepInclude(humanResourcesContextFromResult(result), {
		humanResourcesCode: HUMAN_RESOURCES_ERROR_AUTHORIZATION_DENIED,
		denyCode,
	});
}

describe("authorization policy registry", () => {
	it("resolves leave operations to hr.leave uniquely", () => {
		const policy = resolveHumanResourcesAuthorizationPolicy(
			HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CREATE_DRAFT,
		);
		expect(policy.id).toBe("hr.leave");
	});

	it("throws when no policy matches", () => {
		expect(() =>
			resolveHumanResourcesAuthorizationPolicy(
				HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CREATE_DRAFT,
				[],
			),
		).toThrow(/No HR authorization policy registered/);
	});

	it("throws when multiple policies match", () => {
		expect(() =>
			resolveHumanResourcesAuthorizationPolicy(
				HUMAN_RESOURCES_COMMAND_LEAVE_REQUEST_CREATE_DRAFT,
				[
					stubPolicy({
						id: "hr.leave",
					}),
					stubPolicy({
						id: "hr.leave",
					}),
				],
			),
		).toThrow(/Ambiguous HR authorization policies/);
	});

	it("rejects duplicate exact policy identities", () => {
		const policy = resolveHumanResourcesAuthorizationPolicy(
			HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_GET,
		);
		const duplicatePolicies = [
			{
				...policy,
			},
			{
				...policy,
			},
		] as const;

		expect(() =>
			resolveHumanResourcesAuthorizationPolicy(
				HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_GET,
				duplicatePolicies,
			),
		).toThrow(/Ambiguous/);
	});

	it("classifies every sensitive operation exactly once", () => {
		for (const operationId of HUMAN_RESOURCES_SENSITIVE_OPERATION_IDS) {
			expect(
				resolveHumanResourcesAuthorizationPolicy(operationId),
				`${operationId} must have exactly one policy`,
			).toBeDefined();
		}
	});
});

describe("authorizeHumanResourcesOperation facade", () => {
	it("maps ambiguous resolve failures to authorization_denied", async () => {
		const result = await authorizeHumanResourcesOperation(
			leaveCommandRequest(),
			{
				authorization: leaveOwnAuth(),
				policies: [
					stubPolicy({
						id: "hr.leave",
					}),
					stubPolicy({
						id: "hr.leave",
					}),
				],
			},
		);
		expectAuthorizationDenied(result, "ambiguous_policy");
	});

	it("denies cross-tenant requests", async () => {
		const result = await authorizeHumanResourcesOperation(
			leaveCommandRequest({
				resource: leaveResource({ organizationId: "org-other" }),
			}),
			{ authorization: leaveOwnAuth() },
		);
		expectAuthorizationDenied(result, "cross_tenant");
		if (!result.ok) {
			expect(humanResourcesContextFromResult(result)).toMatchObject({
				policyId: "hr.tenant-boundary",
				resourceKind: "leave_request",
				resourceId: "leave-1",
			});
		}
	});

	it("passes through manifest permission port denials", async () => {
		const result = await authorizeHumanResourcesOperation(
			leaveCommandRequest(),
			{ authorization: grantingAuthorization(new Set()) },
		);
		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.code).toBe("FORBIDDEN");
		expect(humanResourcesContextFromResult(result)).toMatchObject({
			humanResourcesCode: HUMAN_RESOURCES_ERROR_FORBIDDEN,
			permission: HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN,
		});
	});

	it("denies when requiredPermission disagrees with the module manifest", async () => {
		const result = await authorizeHumanResourcesOperation(
			leaveQueryRequest({
				requiredPermission:
					HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_SENSITIVE_READ,
			}),
			{
				authorization: grantingAuthorization(
					new Set([HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_SENSITIVE_READ]),
				),
			},
		);
		expectAuthorizationDenied(result, "permission_denied");
		if (!result.ok) {
			expect(humanResourcesContextFromResult(result)).toMatchObject({
				policyId: "hr.manifest-permission",
			});
		}
	});

	it("requires resource context for subject-scoped sensitive commands", async () => {
		const result = await authorizeHumanResourcesOperation(
			leaveCommandRequest({ resource: undefined }),
			{ authorization: leaveOwnAuth() },
		);
		expectAuthorizationDenied(result, "resource_context_required");
	});

	it("allows subject-scoped access and denies subject mismatch", async () => {
		const authorization = leaveOwnAuth();
		const allowed = await authorizeHumanResourcesOperation(
			leaveCommandRequest(),
			{ authorization },
		);
		expect(allowed.ok).toBe(true);
		if (allowed.ok) {
			expect(allowed.data).toMatchObject({
				allowed: true,
				policyId: "hr.leave",
			});
			expect(allowed.data.projection).toBeUndefined();
		}

		const denied = await authorizeHumanResourcesOperation(
			leaveCommandRequest({
				resource: leaveResource({ subjectEmployeeId: "employee-other" }),
			}),
			{ authorization },
		);
		expectAuthorizationDenied(denied, "subject_scope_denied");
	});

	it("allows manager scope only for the resource manager", async () => {
		const policies: HumanResourcesAuthorizationPolicy[] = [
			stubPolicy({
				id: "hr.leave",
				mode: "resource_scoped",
				async evaluate(request) {
					const { resource } = request;
					if (!resource) {
						return {
							allowed: false,
							code: "resource_context_required",
							reason: "missing",
							policyId: "hr.leave",
						};
					}
					const isManager =
						request.actor.actorEmployeeId !== undefined &&
						request.actor.actorEmployeeId === resource.managerEmployeeId;
					return (await isManager)
						? { allowed: true, policyId: "hr.leave" }
						: {
								allowed: false,
								code: "subject_scope_denied",
								reason: "not manager",
								policyId: "hr.leave",
							};
				},
			}),
		];

		const asManager = await authorizeHumanResourcesOperation(
			leaveCommandRequest({
				actor: baseActor({ actorEmployeeId: "manager-1" }),
				resource: leaveResource({
					subjectEmployeeId: "employee-1",
					managerEmployeeId: "manager-1",
				}),
			}),
			{ authorization: leaveOwnAuth(), policies },
		);
		expect(asManager.ok).toBe(true);
		if (asManager.ok) {
			expect(asManager.data).toMatchObject({ allowed: true });
		}

		const asSubjectOnly = await authorizeHumanResourcesOperation(
			leaveCommandRequest({
				resource: leaveResource({
					subjectEmployeeId: "employee-1",
					managerEmployeeId: "manager-1",
				}),
			}),
			{ authorization: leaveOwnAuth(), policies },
		);
		expectAuthorizationDenied(asSubjectOnly, "subject_scope_denied");
		if (!asSubjectOnly.ok) {
			expect(asSubjectOnly.message).not.toMatch(/not manager/i);
		}
	});

	it("returns field projection for sensitive queries", async () => {
		const redacted = await authorizeHumanResourcesOperation(
			leaveQueryRequest(),
			{ authorization: leaveOwnAuth() },
		);
		expect(redacted.ok).toBe(true);
		if (redacted.ok) {
			expect(redacted.data).toMatchObject({
				allowed: true,
				projection: {
					allowedFields: ["status"],
					deniedFields: ["medicalDetails", "note"],
				},
			});
		}

		const granted = await authorizeHumanResourcesOperation(
			leaveQueryRequest({
				actorPermissions: [
					HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_OWN,
					HUMAN_RESOURCES_PERMISSION_LEAVE_REQUEST_SENSITIVE_READ,
				],
			}),
			{ authorization: leaveOwnAuth() },
		);
		expect(granted.ok).toBe(true);
		if (granted.ok) {
			expect(granted.data).toMatchObject({
				allowed: true,
				projection: {
					allowedFields: ["status", "medicalDetails", "note"],
					deniedFields: [],
				},
			});
		}
	});

	it("denies queries when every requested field is inaccessible", async () => {
		const result = await authorizeHumanResourcesOperation(
			leaveQueryRequest({
				requestedFields: ["medicalDetails", "note"],
			}),
			{ authorization: leaveOwnAuth() },
		);
		expectAuthorizationDenied(result, "field_access_denied");
	});

	it("allows non-sensitive operations via manifest_only", async () => {
		const result = await authorizeHumanResourcesOperation(
			{
				operationId: HUMAN_RESOURCES_COMMAND_DEPARTMENT_CREATE,
				operationKind: "command",
				requiredPermission: HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE,
				actor: baseActor({ actorEmployeeId: undefined }),
			},
			{
				authorization: grantingAuthorization(
					new Set([HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE]),
				),
			},
		);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data).toEqual({
				allowed: true,
				policyId: HUMAN_RESOURCES_MANIFEST_ONLY_POLICY_ID,
			});
		}
	});
});
