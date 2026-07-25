import { describe, expect, it } from "vitest";

import type { HumanResourcesAuthorizationPort } from "../src/authorization";
import {
	HUMAN_RESOURCES_COMMAND_COMPETENCY_ASSESSMENT_RECORD,
	HUMAN_RESOURCES_COMMAND_SUCCESSION_PLAN_CREATE,
	HUMAN_RESOURCES_QUERY_APPROVED_COMPENSATION_HANDOFF_GET,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_COMPETENCY_PROFILE_GET,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_DOCUMENT_GET,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_PROFILE_GET,
	HUMAN_RESOURCES_QUERY_HEADCOUNT_PLAN_APPROVED_GET,
	HUMAN_RESOURCES_QUERY_TALENT_PROFILE_GET_BY_EMPLOYEE,
	type HumanResourcesQueryId,
} from "../src/module-ids";
import {
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
	HUMAN_RESOURCES_PERMISSION_COMPETENCY_READ,
	HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_REGISTER,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_VERIFY,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
	HUMAN_RESOURCES_PERMISSION_IDENTITY_DOCUMENT_SENSITIVE_READ,
	HUMAN_RESOURCES_PERMISSION_PERSON_READ,
	HUMAN_RESOURCES_PERMISSION_SUCCESSION_ADMIN,
	HUMAN_RESOURCES_PERMISSION_TALENT_ADMIN,
	HUMAN_RESOURCES_PERMISSION_TALENT_PROFILE_SENSITIVE_READ,
	HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_READ,
} from "../src/permissions";
import { resolveHumanResourcesAuthorizationPolicy } from "../src/shared/authorization-policy-registry";
import type { HumanResourcesAuthorizationRequest } from "../src/shared/authorization-types";
import { authorizeHumanResourcesOperation } from "../src/shared/contextual-authorization";
import {
	COMPENSATION_FIELD_CLASSES,
	TALENT_SUCCESSION_SENSITIVE_FIELD_NAMES,
	WORKFORCE_PLANNING_EMPLOYEE_ACTUAL_FIELDS,
} from "../src/shared/field-projection";

function grantingAuthorization(
	permissions: ReadonlySet<string>,
): HumanResourcesAuthorizationPort {
	return {
		async can(input) {
			return permissions.has(input.permission);
		},
	};
}

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

/** Synthetic query under employee-compensation.* for tier projection tests. */
const EMPLOYEE_COMPENSATION_GET =
	"human-resources.employee-compensation.get" as HumanResourcesQueryId;

describe("sensitive-domain policies", () => {
	it("resolves talent families to distinct policies", () => {
		expect(
			resolveHumanResourcesAuthorizationPolicy(
				HUMAN_RESOURCES_COMMAND_COMPETENCY_ASSESSMENT_RECORD,
			).id,
		).toBe("hr.talent-assessment");
		expect(
			resolveHumanResourcesAuthorizationPolicy(
				HUMAN_RESOURCES_QUERY_TALENT_PROFILE_GET_BY_EMPLOYEE,
			).id,
		).toBe("hr.talent-profile");
		expect(
			resolveHumanResourcesAuthorizationPolicy(
				HUMAN_RESOURCES_COMMAND_SUCCESSION_PLAN_CREATE,
			).id,
		).toBe("hr.succession");
		expect(
			resolveHumanResourcesAuthorizationPolicy(
				"human-resources.competency.create",
			).id,
		).toBe("hr.manifest-only");
		expect(
			resolveHumanResourcesAuthorizationPolicy(
				HUMAN_RESOURCES_QUERY_EMPLOYEE_PROFILE_GET,
			).id,
		).toBe("hr.employee-profile");
	});

	it("allows employee profile subject, manager scope, and HR person read; denies outsider", async () => {
		const auth = grantingAuthorization(
			new Set([HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ]),
		);
		const subjectOk = await authorizeHumanResourcesOperation(
			{
				operationId: HUMAN_RESOURCES_QUERY_EMPLOYEE_PROFILE_GET,
				operationKind: "query",
				requiredPermission: HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
				actor: baseActor(),
				resource: {
					organizationId: "org-1",
					kind: "employee",
					subjectEmployeeId: "employee-1",
				},
			},
			{ authorization: auth },
		);
		expect(subjectOk).toMatchObject({ ok: true });

		const managerOk = await authorizeHumanResourcesOperation(
			{
				operationId: HUMAN_RESOURCES_QUERY_EMPLOYEE_PROFILE_GET,
				operationKind: "query",
				requiredPermission: HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
				actor: baseActor({ actorEmployeeId: "manager-1" }),
				resource: {
					organizationId: "org-1",
					kind: "employee",
					subjectEmployeeId: "employee-2",
					managerEmployeeId: "manager-1",
					attributes: { inManagerScope: true },
				},
			},
			{ authorization: auth },
		);
		expect(managerOk).toMatchObject({ ok: true });

		const hrOk = await authorizeHumanResourcesOperation(
			{
				operationId: HUMAN_RESOURCES_QUERY_EMPLOYEE_PROFILE_GET,
				operationKind: "query",
				requiredPermission: HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
				actor: baseActor({ actorEmployeeId: "hr-1" }),
				actorPermissions: [
					HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
					HUMAN_RESOURCES_PERMISSION_PERSON_READ,
				],
				resource: {
					organizationId: "org-1",
					kind: "employee",
					subjectEmployeeId: "employee-2",
				},
			},
			{
				authorization: grantingAuthorization(
					new Set([
						HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
						HUMAN_RESOURCES_PERMISSION_PERSON_READ,
					]),
				),
			},
		);
		expect(hrOk).toMatchObject({ ok: true });

		const deniedScope = await authorizeHumanResourcesOperation(
			{
				operationId: HUMAN_RESOURCES_QUERY_EMPLOYEE_PROFILE_GET,
				operationKind: "query",
				requiredPermission: HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
				actor: baseActor({ actorEmployeeId: "employee-9" }),
				actorPermissions: [HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ],
				resource: {
					organizationId: "org-1",
					kind: "employee",
					subjectEmployeeId: "employee-2",
				},
			},
			{ authorization: auth },
		);
		expect(deniedScope).toMatchObject({
			ok: false,
			details: { denyCode: "subject_scope_denied" },
		});
	});

	it("allows talent profile subject and manager scope; denies outsider", async () => {
		const auth = grantingAuthorization(
			new Set([HUMAN_RESOURCES_PERMISSION_TALENT_PROFILE_SENSITIVE_READ]),
		);
		const subjectOk = await authorizeHumanResourcesOperation(
			{
				operationId: HUMAN_RESOURCES_QUERY_TALENT_PROFILE_GET_BY_EMPLOYEE,
				operationKind: "query",
				requiredPermission:
					HUMAN_RESOURCES_PERMISSION_TALENT_PROFILE_SENSITIVE_READ,
				actor: baseActor(),
				resource: {
					organizationId: "org-1",
					kind: "talent_profile",
					subjectEmployeeId: "employee-1",
				},
			},
			{ authorization: auth },
		);
		expect(subjectOk).toMatchObject({ ok: true });

		const managerOk = await authorizeHumanResourcesOperation(
			{
				operationId: HUMAN_RESOURCES_QUERY_TALENT_PROFILE_GET_BY_EMPLOYEE,
				operationKind: "query",
				requiredPermission:
					HUMAN_RESOURCES_PERMISSION_TALENT_PROFILE_SENSITIVE_READ,
				actor: baseActor({ actorEmployeeId: "manager-1" }),
				resource: {
					organizationId: "org-1",
					kind: "talent_profile",
					subjectEmployeeId: "employee-2",
					attributes: { inManagerScope: true },
				},
			},
			{ authorization: auth },
		);
		expect(managerOk).toMatchObject({ ok: true });

		const adminOk = await authorizeHumanResourcesOperation(
			{
				operationId: HUMAN_RESOURCES_QUERY_TALENT_PROFILE_GET_BY_EMPLOYEE,
				operationKind: "query",
				requiredPermission:
					HUMAN_RESOURCES_PERMISSION_TALENT_PROFILE_SENSITIVE_READ,
				actor: baseActor({ actorEmployeeId: "admin-1" }),
				actorPermissions: [
					HUMAN_RESOURCES_PERMISSION_TALENT_PROFILE_SENSITIVE_READ,
					HUMAN_RESOURCES_PERMISSION_TALENT_ADMIN,
				],
				resource: {
					organizationId: "org-1",
					kind: "talent_profile",
					subjectEmployeeId: "employee-2",
				},
			},
			{
				authorization: grantingAuthorization(
					new Set([
						HUMAN_RESOURCES_PERMISSION_TALENT_PROFILE_SENSITIVE_READ,
						HUMAN_RESOURCES_PERMISSION_TALENT_ADMIN,
					]),
				),
			},
		);
		expect(adminOk).toMatchObject({ ok: true });

		const deniedScope = await authorizeHumanResourcesOperation(
			{
				operationId: HUMAN_RESOURCES_QUERY_TALENT_PROFILE_GET_BY_EMPLOYEE,
				operationKind: "query",
				requiredPermission:
					HUMAN_RESOURCES_PERMISSION_TALENT_PROFILE_SENSITIVE_READ,
				actor: baseActor({ actorEmployeeId: "employee-9" }),
				actorPermissions: [
					HUMAN_RESOURCES_PERMISSION_TALENT_PROFILE_SENSITIVE_READ,
				],
				resource: {
					organizationId: "org-1",
					kind: "talent_profile",
					subjectEmployeeId: "employee-2",
				},
			},
			{ authorization: auth },
		);
		expect(deniedScope).toMatchObject({
			ok: false,
			details: { denyCode: "subject_scope_denied" },
		});
	});

	it("allows competency profile subject and manager scope; denies outsider", async () => {
		const auth = grantingAuthorization(
			new Set([HUMAN_RESOURCES_PERMISSION_COMPETENCY_READ]),
		);

		const subjectOk = await authorizeHumanResourcesOperation(
			{
				operationId: HUMAN_RESOURCES_QUERY_EMPLOYEE_COMPETENCY_PROFILE_GET,
				operationKind: "query",
				requiredPermission: HUMAN_RESOURCES_PERMISSION_COMPETENCY_READ,
				actor: baseActor(),
				resource: {
					organizationId: "org-1",
					kind: "talent_profile",
					subjectEmployeeId: "employee-1",
				},
				requestedFields: [
					"organizationId",
					"employeeId",
					...TALENT_SUCCESSION_SENSITIVE_FIELD_NAMES,
				],
			},
			{ authorization: auth },
		);
		expect(subjectOk).toMatchObject({ ok: true });

		const managerOk = await authorizeHumanResourcesOperation(
			{
				operationId: HUMAN_RESOURCES_QUERY_EMPLOYEE_COMPETENCY_PROFILE_GET,
				operationKind: "query",
				requiredPermission: HUMAN_RESOURCES_PERMISSION_COMPETENCY_READ,
				actor: baseActor({ actorEmployeeId: "manager-1" }),
				resource: {
					organizationId: "org-1",
					kind: "talent_profile",
					subjectEmployeeId: "employee-2",
					attributes: { inManagerScope: true },
				},
				requestedFields: [
					"organizationId",
					"employeeId",
					"level",
					"evidenceSummary",
				],
			},
			{ authorization: auth },
		);
		expect(managerOk).toMatchObject({ ok: true });

		const deniedScope = await authorizeHumanResourcesOperation(
			{
				operationId: HUMAN_RESOURCES_QUERY_EMPLOYEE_COMPETENCY_PROFILE_GET,
				operationKind: "query",
				requiredPermission: HUMAN_RESOURCES_PERMISSION_COMPETENCY_READ,
				actor: baseActor({ actorEmployeeId: "employee-9" }),
				actorPermissions: [HUMAN_RESOURCES_PERMISSION_COMPETENCY_READ],
				resource: {
					organizationId: "org-1",
					kind: "talent_profile",
					subjectEmployeeId: "employee-2",
				},
				requestedFields: ["organizationId", "employeeId"],
			},
			{ authorization: auth },
		);
		expect(deniedScope).toMatchObject({
			ok: false,
			details: { denyCode: "subject_scope_denied" },
		});
	});

	it("redacts succession-class fields without talent sensitive read permission", async () => {
		const auth = grantingAuthorization(
			new Set([HUMAN_RESOURCES_PERMISSION_COMPETENCY_READ]),
		);
		const result = await authorizeHumanResourcesOperation(
			{
				operationId: HUMAN_RESOURCES_QUERY_EMPLOYEE_COMPETENCY_PROFILE_GET,
				operationKind: "query",
				requiredPermission: HUMAN_RESOURCES_PERMISSION_COMPETENCY_READ,
				actor: baseActor(),
				resource: {
					organizationId: "org-1",
					kind: "talent_profile",
					subjectEmployeeId: "employee-1",
				},
				requestedFields: [
					"organizationId",
					"employeeId",
					"currentClassification",
					"level",
					"evidenceSummary",
				],
			},
			{ authorization: auth },
		);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toMatchObject({ allowed: true });
		if (!result.data.allowed) return;
		expect(result.data.projection?.allowedFields).toEqual(
			expect.arrayContaining(["organizationId", "employeeId"]),
		);
		expect(result.data.projection?.deniedFields).toEqual(
			expect.arrayContaining([
				"currentClassification",
				"level",
				"evidenceSummary",
			]),
		);
	});

	it("denies talent profile get without sensitive read permission", async () => {
		const auth = grantingAuthorization(
			new Set([HUMAN_RESOURCES_PERMISSION_COMPETENCY_READ]),
		);
		const denied = await authorizeHumanResourcesOperation(
			{
				operationId: HUMAN_RESOURCES_QUERY_TALENT_PROFILE_GET_BY_EMPLOYEE,
				operationKind: "query",
				requiredPermission:
					HUMAN_RESOURCES_PERMISSION_TALENT_PROFILE_SENSITIVE_READ,
				actor: baseActor(),
				resource: {
					organizationId: "org-1",
					kind: "talent_profile",
					subjectEmployeeId: "employee-1",
				},
				requestedFields: ["currentClassification"],
			},
			{ authorization: auth },
		);
		expect(denied.ok).toBe(false);
	});

	it("requires privileged access for succession", async () => {
		const denied = await authorizeHumanResourcesOperation(
			{
				operationId: HUMAN_RESOURCES_COMMAND_SUCCESSION_PLAN_CREATE,
				operationKind: "command",
				requiredPermission: HUMAN_RESOURCES_PERMISSION_SUCCESSION_ADMIN,
				actor: baseActor(),
			},
			{
				authorization: grantingAuthorization(
					new Set([HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_READ]),
				),
			},
		);
		expect(denied.ok).toBe(false);

		const allowed = await authorizeHumanResourcesOperation(
			{
				operationId: HUMAN_RESOURCES_COMMAND_SUCCESSION_PLAN_CREATE,
				operationKind: "command",
				requiredPermission: HUMAN_RESOURCES_PERMISSION_SUCCESSION_ADMIN,
				actor: baseActor(),
			},
			{
				authorization: grantingAuthorization(
					new Set([HUMAN_RESOURCES_PERMISSION_SUCCESSION_ADMIN]),
				),
			},
		);
		expect(allowed).toMatchObject({ ok: true });
	});

	it("denies employee-level actuals on workforce plan reads", async () => {
		const result = await authorizeHumanResourcesOperation(
			{
				operationId: HUMAN_RESOURCES_QUERY_HEADCOUNT_PLAN_APPROVED_GET,
				operationKind: "query",
				requiredPermission: HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_READ,
				actor: baseActor(),
				requestedFields: [
					"planId",
					"status",
					...WORKFORCE_PLANNING_EMPLOYEE_ACTUAL_FIELDS,
				],
			},
			{
				authorization: grantingAuthorization(
					new Set([HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_READ]),
				),
			},
		);
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.data).toMatchObject({ allowed: true });
		if (!result.data.allowed) return;
		expect(result.data.projection?.deniedFields).toEqual(
			expect.arrayContaining([...WORKFORCE_PLANNING_EMPLOYEE_ACTUAL_FIELDS]),
		);
		expect(result.data.projection?.allowedFields).toEqual(
			expect.arrayContaining(["planId", "status"]),
		);
	});

	it("exposes COMPENSATION_FIELD_CLASSES tiers and blocks manager payroll handoff", async () => {
		expect(COMPENSATION_FIELD_CLASSES.public).toContain("currencyCode");
		expect(COMPENSATION_FIELD_CLASSES.confidential).toContain("baseAmount");

		const managerHandoff = await authorizeHumanResourcesOperation(
			{
				operationId: HUMAN_RESOURCES_QUERY_APPROVED_COMPENSATION_HANDOFF_GET,
				operationKind: "query",
				requiredPermission: HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
				actor: baseActor({ actorEmployeeId: "manager-1" }),
				resource: {
					organizationId: "org-1",
					kind: "compensation",
					subjectEmployeeId: "employee-2",
					managerEmployeeId: "manager-1",
				},
				requestedFields: [...COMPENSATION_FIELD_CLASSES.payroll],
			},
			{
				authorization: grantingAuthorization(
					new Set([HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ]),
				),
			},
		);
		expect(managerHandoff).toMatchObject({
			ok: false,
			details: { denyCode: "subject_scope_denied" },
		});

		const managerGrade = await authorizeHumanResourcesOperation(
			{
				operationId: EMPLOYEE_COMPENSATION_GET,
				operationKind: "query",
				requiredPermission: HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
				actor: baseActor({ actorEmployeeId: "manager-1" }),
				resource: {
					organizationId: "org-1",
					kind: "compensation",
					subjectEmployeeId: "employee-2",
					attributes: { inManagerScope: true },
				},
				requestedFields: [
					...COMPENSATION_FIELD_CLASSES.public,
					...COMPENSATION_FIELD_CLASSES.manager,
					"baseAmount",
				],
			},
			{
				authorization: grantingAuthorization(
					new Set([HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ]),
				),
			},
		);
		expect(managerGrade.ok).toBe(true);
		if (!managerGrade.ok || !managerGrade.data.allowed) return;
		expect(managerGrade.data.projection?.allowedFields).toEqual(
			expect.arrayContaining([
				...COMPENSATION_FIELD_CLASSES.public,
				...COMPENSATION_FIELD_CLASSES.manager,
			]),
		);
		expect(managerGrade.data.projection?.deniedFields).toContain("baseAmount");

		const payrollOk = await authorizeHumanResourcesOperation(
			{
				operationId: HUMAN_RESOURCES_QUERY_APPROVED_COMPENSATION_HANDOFF_GET,
				operationKind: "query",
				requiredPermission: HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
				actor: baseActor(),
				actorPermissions: [
					HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
					HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
				],
				resource: {
					organizationId: "org-1",
					kind: "compensation",
					subjectEmployeeId: "employee-2",
					attributes: { privilegedActor: true },
				},
				requestedFields: [...COMPENSATION_FIELD_CLASSES.payroll],
			},
			{
				authorization: grantingAuthorization(
					new Set([
						HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
						HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
					]),
				),
			},
		);
		expect(payrollOk).toMatchObject({ ok: true });
	});

	it("allows compliance subject, HR operator, and masks identifiers for managers", async () => {
		const subjectOk = await authorizeHumanResourcesOperation(
			{
				operationId: HUMAN_RESOURCES_QUERY_EMPLOYEE_DOCUMENT_GET,
				operationKind: "query",
				requiredPermission:
					HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_READ,
				actor: baseActor(),
				resource: {
					organizationId: "org-1",
					kind: "employee_document",
					subjectEmployeeId: "employee-1",
				},
				requestedFields: ["status", "identifierLast4"],
			},
			{
				authorization: grantingAuthorization(
					new Set([HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_READ]),
				),
			},
		);
		expect(subjectOk.ok).toBe(true);
		if (!subjectOk.ok || !subjectOk.data.allowed) return;
		expect(subjectOk.data.projection?.deniedFields).toContain(
			"identifierLast4",
		);

		const ownRegisterDeniedForOther = await authorizeHumanResourcesOperation(
			{
				operationId: HUMAN_RESOURCES_QUERY_EMPLOYEE_DOCUMENT_GET,
				operationKind: "query",
				requiredPermission:
					HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_READ,
				actor: baseActor({ actorEmployeeId: "employee-9" }),
				actorPermissions: [
					HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_REGISTER,
				],
				resource: {
					organizationId: "org-1",
					kind: "employee_document",
					subjectEmployeeId: "employee-2",
				},
			},
			{
				authorization: grantingAuthorization(
					new Set([
						HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_READ,
						HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_REGISTER,
					]),
				),
			},
		);
		expect(ownRegisterDeniedForOther).toMatchObject({
			ok: false,
			details: { denyCode: "subject_scope_denied" },
		});

		const hrOk = await authorizeHumanResourcesOperation(
			{
				operationId: HUMAN_RESOURCES_QUERY_EMPLOYEE_DOCUMENT_GET,
				operationKind: "query",
				requiredPermission:
					HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_READ,
				actor: baseActor({ actorEmployeeId: "hr-1" }),
				actorPermissions: [
					HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_READ,
					HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_VERIFY,
				],
				resource: {
					organizationId: "org-1",
					kind: "employee_document",
					subjectEmployeeId: "employee-2",
				},
			},
			{
				authorization: grantingAuthorization(
					new Set([
						HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_READ,
						HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_VERIFY,
					]),
				),
			},
		);
		expect(hrOk).toMatchObject({ ok: true });

		const complianceOk = await authorizeHumanResourcesOperation(
			{
				operationId: HUMAN_RESOURCES_QUERY_EMPLOYEE_DOCUMENT_GET,
				operationKind: "query",
				requiredPermission:
					HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_READ,
				actor: baseActor({ actorEmployeeId: "compliance-1" }),
				actorPermissions: [
					HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_READ,
					HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
					HUMAN_RESOURCES_PERMISSION_IDENTITY_DOCUMENT_SENSITIVE_READ,
				],
				resource: {
					organizationId: "org-1",
					kind: "employee_document",
					subjectEmployeeId: "employee-2",
				},
				requestedFields: ["status", "identifierLast4"],
			},
			{
				authorization: grantingAuthorization(
					new Set([
						HUMAN_RESOURCES_PERMISSION_EMPLOYEE_DOCUMENT_OWN_READ,
						HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
						HUMAN_RESOURCES_PERMISSION_IDENTITY_DOCUMENT_SENSITIVE_READ,
					]),
				),
			},
		);
		expect(complianceOk.ok).toBe(true);
		if (!complianceOk.ok || !complianceOk.data.allowed) return;
		expect(complianceOk.data.projection?.allowedFields).toContain(
			"identifierLast4",
		);
	});
});
