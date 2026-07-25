/**
 * ER specialized case policy under the authorization facade (Slice 2.2 / OPEN-DECISION-02 A).
 */

import { describe, expect, it } from "vitest";

import type { HumanResourcesPermission } from "../src/authorization";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import {
	EMPLOYEE_RELATIONS_CASE_POLICY_ID,
	employeeCaseToResourceContext,
	employeeRelationsCasePolicy,
} from "../src/employee-relations/case-authorization-policy";
import {
	getEmployeeCaseById,
	getEmployeeCaseTimeline,
	openEmployeeCase,
} from "../src/employee-relations/employee-case";
import {
	HUMAN_RESOURCES_ERROR_AUTHORIZATION_DENIED,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
} from "../src/error-codes";
import {
	HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_GET,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_RELATIONS_HISTORY_BY_EMPLOYEE,
} from "../src/module-ids";
import {
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ASSIGNED_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_EXCEPTIONAL_ADMIN,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_INVESTIGATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_OPEN,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
} from "../src/permissions";
import { resolveHumanResourcesAuthorizationPolicy } from "../src/shared/authorization-policy-registry";
import { createParityResourceShell } from "../src/shared/run-authorized-operation";
import { createMemoryHumanResourcesStore } from "../src/testing";
import { createTestHumanResourcesCommandOptions } from "./helpers/command-options";
import {
	createStoreBackedIdentityResolver,
	mapActorToEmployee,
} from "./helpers/identity-resolver";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { humanResourcesCodeFromResult } from "./helpers/result-details";

const ORG = "org-er-case-policy";
const OWNER = "user-er-case-policy-owner";
const OUTSIDER = "user-er-case-policy-outsider";

const ER_PERMISSIONS: readonly HumanResourcesPermission[] = [
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_OPEN,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ASSIGNED_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_INVESTIGATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_EXCEPTIONAL_ADMIN,
];

function harness(
	permissions: readonly HumanResourcesPermission[] = ER_PERMISSIONS,
) {
	const store = createMemoryHumanResourcesStore();
	const ports = createMemoryMutationPorts();
	const authorization = createGrantingHumanResourcesAuthorization(permissions);
	const identityResolver = createStoreBackedIdentityResolver(store);
	return createTestHumanResourcesCommandOptions({
		store,
		ports,
		authorization,
		identityResolver,
	});
}

async function seedOwnedCase(ready: ReturnType<typeof harness>) {
	const seedReady = {
		...ready,
		authorization: createGrantingHumanResourcesAuthorization([
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
			HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
		]),
	};

	const subjectEmployee = await createEmployee(
		{
			organizationId: ORG,
			actorUserId: OWNER,
			correlationId: "corr-policy-subject",
			idempotencyKey: `idem-policy-subject-${Date.now()}`,
			employeeNumber: `E-POL-SUB-${Date.now()}`,
			legalName: "Policy Subject",
		},
		seedReady,
	);
	if (!subjectEmployee.ok) {
		throw new Error(subjectEmployee.message);
	}

	const ownerEmployee = await createEmployee(
		{
			organizationId: ORG,
			actorUserId: OWNER,
			correlationId: "corr-policy-owner",
			idempotencyKey: `idem-policy-owner-${Date.now()}`,
			employeeNumber: `E-POL-OWN-${Date.now()}`,
			legalName: "Policy Owner",
		},
		seedReady,
	);
	if (!ownerEmployee.ok) {
		throw new Error(ownerEmployee.message);
	}

	await mapActorToEmployee(ready.store, {
		organizationId: ORG,
		userId: OWNER,
		employeeId: ownerEmployee.data.id,
		actorUserId: OWNER,
		effectiveFrom: "2025-01-01",
	});

	const employment = await createEmployment(
		{
			organizationId: ORG,
			actorUserId: OWNER,
			correlationId: "corr-policy-employ",
			employeeId: subjectEmployee.data.id,
			startsOn: "2025-01-01",
		},
		seedReady,
	);
	if (!employment.ok) {
		throw new Error(employment.message);
	}

	const opened = await openEmployeeCase(
		{
			organizationId: ORG,
			actorUserId: OWNER,
			correlationId: "corr-policy-open",
			idempotencyKey: `idem-policy-case-${Date.now()}`,
			employeeId: subjectEmployee.data.id,
			employmentId: employment.data.id,
			caseType: "conduct",
			severity: "medium",
			allegationSummary: "Sensitive allegation narrative",
			classificationCode: "CONDUCT-01",
			ownerActorUserId: OWNER,
			subjectActorUserId: null,
			conflictedActorUserIds: [],
		},
		ready,
	);
	if (!opened.ok) {
		throw new Error(opened.message);
	}

	return { employeeCase: opened.data, subjectEmployee: subjectEmployee.data };
}

describe("employee relations case authorization policy", () => {
	it("resolves case get and history queries to the specialized policy id", () => {
		expect(
			resolveHumanResourcesAuthorizationPolicy(
				HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_GET,
			).id,
		).toBe(EMPLOYEE_RELATIONS_CASE_POLICY_ID);
		expect(
			resolveHumanResourcesAuthorizationPolicy(
				HUMAN_RESOURCES_QUERY_EMPLOYEE_RELATIONS_HISTORY_BY_EMPLOYEE,
			).id,
		).toBe(EMPLOYEE_RELATIONS_CASE_POLICY_ID);
		expect(employeeRelationsCasePolicy.mode).toBe("specialized");
		expect(employeeRelationsCasePolicy.resourceRequired).toBe(true);
	});

	it("denies evaluate without employee_case resource context", async () => {
		const decision = await employeeRelationsCasePolicy.evaluate(
			{
				operationId: HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_GET,
				operationKind: "query",
				requiredPermission:
					HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ASSIGNED_READ,
				actor: {
					organizationId: ORG,
					actorUserId: OWNER,
					correlationId: "corr-policy-no-resource",
				},
			},
			{},
		);
		expect(decision).toMatchObject({
			allowed: false,
			policyId: EMPLOYEE_RELATIONS_CASE_POLICY_ID,
			code: "resource_context_required",
		});
	});

	it("projects investigator fields for case owner get via the facade", async () => {
		const ready = harness();
		const { employeeCase } = await seedOwnedCase(ready);

		const direct = await getEmployeeCaseById(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-policy-owner-get",
				caseId: employeeCase.id,
			},
			ready,
		);
		expect(direct.ok).toBe(true);
		if (!direct.ok) return;

		expect(direct.data.id).toBe(employeeCase.id);
		expect(direct.data.classificationCode).toBe("CONDUCT-01");
		expect(direct.data.allegationSummary).toBe(
			"Sensitive allegation narrative",
		);
		expect(direct.data.findingSummary).toBeNull();
		expect(typeof direct.data.createdAt).toBe("string");
	});

	it("denies outsider get through the facade with authorization_denied", async () => {
		const ready = harness();
		const { employeeCase } = await seedOwnedCase(ready);

		const denied = await getEmployeeCaseById(
			{
				organizationId: ORG,
				actorUserId: OUTSIDER,
				correlationId: "corr-policy-outsider-get",
				caseId: employeeCase.id,
			},
			{
				...ready,
				authorization: createGrantingHumanResourcesAuthorization([
					HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ASSIGNED_READ,
				]),
			},
		);
		expect(denied.ok).toBe(false);
		expect(humanResourcesCodeFromResult(denied)).toBe(
			HUMAN_RESOURCES_ERROR_AUTHORIZATION_DENIED,
		);
	});

	it("returns NOT_FOUND for missing cases before authorize", async () => {
		const ready = harness();
		await seedOwnedCase(ready);

		const missing = await getEmployeeCaseById(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-policy-missing",
				caseId: "00000000-0000-4000-8000-000000000099",
			},
			ready,
		);
		expect(missing.ok).toBe(false);
		expect(humanResourcesCodeFromResult(missing)).toBe(
			HUMAN_RESOURCES_ERROR_NOT_FOUND,
		);
	});

	it("maps employee case rows to resource context facts", async () => {
		const ready = harness();
		const { employeeCase } = await seedOwnedCase(ready);
		const resource = employeeCaseToResourceContext(employeeCase);
		expect(resource).toMatchObject({
			organizationId: ORG,
			kind: "employee_case",
			resourceId: employeeCase.id,
			subjectEmployeeId: employeeCase.employeeId,
			ownerUserId: OWNER,
		});
		expect(resource.assignedUserIds).toContain(OWNER);
	});

	it("allows privileged parity shell without resourceId for list/command paths", async () => {
		const decision = await employeeRelationsCasePolicy.evaluate(
			{
				operationId: HUMAN_RESOURCES_QUERY_EMPLOYEE_CASE_GET,
				operationKind: "query",
				requiredPermission:
					HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ASSIGNED_READ,
				actor: {
					organizationId: ORG,
					actorUserId: OWNER,
					correlationId: "corr-policy-parity-shell",
				},
				resource: createParityResourceShell({
					organizationId: ORG,
					kind: "employee_case",
				}),
			},
			{},
		);
		expect(decision).toMatchObject({
			allowed: true,
			policyId: EMPLOYEE_RELATIONS_CASE_POLICY_ID,
		});
	});

	it("denies timeline through the same facade ACL as get", async () => {
		const ready = harness();
		const { employeeCase } = await seedOwnedCase(ready);

		const denied = await getEmployeeCaseTimeline(
			{
				organizationId: ORG,
				actorUserId: OUTSIDER,
				correlationId: "corr-policy-outsider-timeline",
				caseId: employeeCase.id,
			},
			{
				...ready,
				authorization: createGrantingHumanResourcesAuthorization([
					HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ASSIGNED_READ,
				]),
			},
		);
		expect(denied.ok).toBe(false);
		expect(humanResourcesCodeFromResult(denied)).toBe(
			HUMAN_RESOURCES_ERROR_AUTHORIZATION_DENIED,
		);
	});
});
