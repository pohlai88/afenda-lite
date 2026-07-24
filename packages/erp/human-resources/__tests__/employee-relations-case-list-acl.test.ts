/**
 * Employee-relations case list authorization (HR-ENT-ER-CASE-LIST-ACL / HR-GOV-P0-001).
 */

import { describe, expect, it } from "vitest";

import type { HumanResourcesPermission } from "../src/authorization";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import {
	addEmployeeCaseParticipant,
	getEmployeeCaseById,
	getEmployeeCaseOutcome,
	getEmployeeCaseTimeline,
	getEmployeeRelationsHistoryByEmployee,
	listEmployeeCases,
	listOpenEmployeeRelationsCases,
	openEmployeeCase,
} from "../src/employee-relations/employee-case";
import {
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_UNAUTHORIZED,
} from "../src/error-codes";
import {
	HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ASSIGNED_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_EXCEPTIONAL_ADMIN,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_INVESTIGATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_OPEN,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
} from "../src/permissions";
import { createMemoryHumanResourcesStore } from "../src/testing";
import { createTestHumanResourcesCommandOptions } from "./helpers/command-options";
import {
	createStoreBackedIdentityResolver,
	mapActorToEmployee,
} from "./helpers/identity-resolver";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { humanResourcesCodeFromResult } from "./helpers/result-details";

const ORG = "org-er-list-acl";
const OTHER_ORG = "org-er-list-acl-b";
const OWNER = "user-er-list-owner";
const PARTICIPANT = "user-er-list-participant";
const OUTSIDER = "user-er-list-outsider";
const ADMIN = "user-er-list-admin";
const UNMAPPED_ADMIN = "user-er-list-unmapped-admin";

const ADMIN_WITHOUT_EMPLOYEE_IDENTITY_PERMISSIONS: readonly HumanResourcesPermission[] =
	[
		HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ASSIGNED_READ,
		HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_EXCEPTIONAL_ADMIN,
		HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
	];

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

async function seedCaseActors(ready: ReturnType<typeof harness>) {
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
			correlationId: "corr-subject-emp",
			idempotencyKey: `idem-subject-${Date.now()}`,
			employeeNumber: `E-SUB-${Date.now()}`,
			legalName: "Case Subject",
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
			correlationId: "corr-owner-emp",
			idempotencyKey: `idem-owner-${Date.now()}`,
			employeeNumber: `E-OWN-${Date.now()}`,
			legalName: "Case Owner",
		},
		seedReady,
	);
	if (!ownerEmployee.ok) {
		throw new Error(ownerEmployee.message);
	}

	const participantEmployee = await createEmployee(
		{
			organizationId: ORG,
			actorUserId: OWNER,
			correlationId: "corr-participant-emp",
			idempotencyKey: `idem-participant-${Date.now()}`,
			employeeNumber: `E-PART-${Date.now()}`,
			legalName: "Case Participant",
		},
		seedReady,
	);
	if (!participantEmployee.ok) {
		throw new Error(participantEmployee.message);
	}

	const adminEmployee = await createEmployee(
		{
			organizationId: ORG,
			actorUserId: OWNER,
			correlationId: "corr-admin-emp",
			idempotencyKey: `idem-admin-${Date.now()}`,
			employeeNumber: `E-ADM-${Date.now()}`,
			legalName: "Case Admin",
		},
		seedReady,
	);
	if (!adminEmployee.ok) {
		throw new Error(adminEmployee.message);
	}

	await mapActorToEmployee(ready.store, {
		organizationId: ORG,
		userId: OWNER,
		employeeId: ownerEmployee.data.id,
		actorUserId: OWNER,
		effectiveFrom: "2025-01-01",
	});
	await mapActorToEmployee(ready.store, {
		organizationId: ORG,
		userId: PARTICIPANT,
		employeeId: participantEmployee.data.id,
		actorUserId: OWNER,
		effectiveFrom: "2025-01-01",
	});
	await mapActorToEmployee(ready.store, {
		organizationId: ORG,
		userId: ADMIN,
		employeeId: adminEmployee.data.id,
		actorUserId: OWNER,
		effectiveFrom: "2025-01-01",
	});

	const employment = await createEmployment(
		{
			organizationId: ORG,
			actorUserId: OWNER,
			correlationId: "corr-employ",
			employeeId: subjectEmployee.data.id,
			startsOn: "2025-01-01",
		},
		seedReady,
	);
	if (!employment.ok) {
		throw new Error(employment.message);
	}

	return {
		subjectEmployee: subjectEmployee.data,
		ownerEmployee: ownerEmployee.data,
		participantEmployee: participantEmployee.data,
		employment: employment.data,
	};
}

async function openSeededCase(
	ready: ReturnType<typeof harness>,
	input: {
		employeeId: string;
		employmentId: string;
		ownerActorUserId?: string;
	},
) {
	return openEmployeeCase(
		{
			organizationId: ORG,
			actorUserId: OWNER,
			correlationId: "corr-open",
			idempotencyKey: `idem-case-${Date.now()}-${Math.random()}`,
			employeeId: input.employeeId,
			employmentId: input.employmentId,
			caseType: "conduct",
			severity: "medium",
			allegationSummary: "Sensitive allegation narrative",
			classificationCode: "CONDUCT-01",
			ownerActorUserId: input.ownerActorUserId ?? OWNER,
			subjectActorUserId: null,
			conflictedActorUserIds: [],
		},
		ready,
	);
}

describe("employee relations case list ACL", () => {
	it("denies exceptional and compliance administrators without employee identity mapping on every read path", async () => {
		const ready = harness();
		const { subjectEmployee, employment } = await seedCaseActors(ready);
		const opened = await openSeededCase(ready, {
			employeeId: subjectEmployee.id,
			employmentId: employment.id,
		});
		expect(opened.ok).toBe(true);
		if (!opened.ok) return;

		const adminReady = {
			...ready,
			authorization: createGrantingHumanResourcesAuthorization(
				ADMIN_WITHOUT_EMPLOYEE_IDENTITY_PERMISSIONS,
			),
		};

		const direct = await getEmployeeCaseById(
			{
				organizationId: ORG,
				actorUserId: UNMAPPED_ADMIN,
				correlationId: "corr-unmapped-admin-direct",
				caseId: opened.data.id,
			},
			adminReady,
		);
		expect(direct.ok).toBe(false);
		expect(humanResourcesCodeFromResult(direct)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);

		const listed = await listEmployeeCases(
			{
				organizationId: ORG,
				actorUserId: UNMAPPED_ADMIN,
				correlationId: "corr-unmapped-admin-list",
			},
			adminReady,
		);
		expect(listed.ok).toBe(false);
		expect(humanResourcesCodeFromResult(listed)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);

		const history = await getEmployeeRelationsHistoryByEmployee(
			{
				organizationId: ORG,
				actorUserId: UNMAPPED_ADMIN,
				correlationId: "corr-unmapped-admin-history",
				employeeId: subjectEmployee.id,
			},
			adminReady,
		);
		expect(history.ok).toBe(false);
		expect(humanResourcesCodeFromResult(history)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);

		const timeline = await getEmployeeCaseTimeline(
			{
				organizationId: ORG,
				actorUserId: UNMAPPED_ADMIN,
				correlationId: "corr-unmapped-admin-timeline",
				caseId: opened.data.id,
			},
			adminReady,
		);
		expect(timeline.ok).toBe(false);
		expect(humanResourcesCodeFromResult(timeline)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);

		const outcome = await getEmployeeCaseOutcome(
			{
				organizationId: ORG,
				actorUserId: UNMAPPED_ADMIN,
				correlationId: "corr-unmapped-admin-outcome",
				caseId: opened.data.id,
			},
			adminReady,
		);
		expect(outcome.ok).toBe(false);
		expect(humanResourcesCodeFromResult(outcome)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);
	});

	it("denies list queries for actors without employee identity mapping", async () => {
		const ready = harness();
		const { subjectEmployee, employment } = await seedCaseActors(ready);
		const opened = await openSeededCase(ready, {
			employeeId: subjectEmployee.id,
			employmentId: employment.id,
		});
		expect(opened.ok).toBe(true);
		if (!opened.ok) return;

		const listed = await listEmployeeCases(
			{
				organizationId: ORG,
				actorUserId: OUTSIDER,
				correlationId: "corr-outsider-list",
			},
			{
				...ready,
				authorization: createGrantingHumanResourcesAuthorization([
					HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ASSIGNED_READ,
				]),
			},
		);
		expect(listed.ok).toBe(false);
		expect(humanResourcesCodeFromResult(listed)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);
	});

	it("includes only authorized cases for mixed visibility", async () => {
		const investigatorPermissions: readonly HumanResourcesPermission[] = [
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
			HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_OPEN,
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ASSIGNED_READ,
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_INVESTIGATE,
		];
		const ready = harness(investigatorPermissions);
		const { subjectEmployee, employment } = await seedCaseActors(ready);

		const visible = await openSeededCase(ready, {
			employeeId: subjectEmployee.id,
			employmentId: employment.id,
		});
		expect(visible.ok).toBe(true);
		if (!visible.ok) return;

		const hidden = await openSeededCase(ready, {
			employeeId: subjectEmployee.id,
			employmentId: employment.id,
			ownerActorUserId: PARTICIPANT,
		});
		expect(hidden.ok).toBe(true);
		if (!hidden.ok) return;

		const ownerList = await listEmployeeCases(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-owner-list",
			},
			ready,
		);
		expect(ownerList.ok).toBe(true);
		if (!ownerList.ok) return;
		expect(ownerList.data.totalCount).toBe(1);
		expect(ownerList.data.cases.map((item) => item.id)).toEqual([
			visible.data.id,
		]);
	});

	it("allows case owner investigator list visibility and projection", async () => {
		const ready = harness();
		const { subjectEmployee, employment } = await seedCaseActors(ready);
		const opened = await openSeededCase(ready, {
			employeeId: subjectEmployee.id,
			employmentId: employment.id,
		});
		expect(opened.ok).toBe(true);
		if (!opened.ok) return;

		const listed = await listEmployeeCases(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-owner-projection",
			},
			ready,
		);
		expect(listed.ok).toBe(true);
		if (!listed.ok) return;
		expect(listed.data.cases).toHaveLength(1);
		const row = listed.data.cases[0];
		expect(row?.classificationCode).toBe("CONDUCT-01");
		expect(row?.allegationSummary).toBeUndefined();
		expect(row?.findingSummary).toBeUndefined();
	});

	it("allows participant visibility with reduced projection", async () => {
		const ready = harness();
		const { subjectEmployee, employment } = await seedCaseActors(ready);
		const opened = await openSeededCase(ready, {
			employeeId: subjectEmployee.id,
			employmentId: employment.id,
		});
		expect(opened.ok).toBe(true);
		if (!opened.ok) return;

		const participantAdded = await addEmployeeCaseParticipant(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-add-participant",
				caseId: opened.data.id,
				participantActorUserId: PARTICIPANT,
				role: "witness",
				expectedVersion: opened.data.version,
			},
			ready,
		);
		expect(participantAdded.ok).toBe(true);
		if (!participantAdded.ok) return;

		const listed = await listEmployeeCases(
			{
				organizationId: ORG,
				actorUserId: PARTICIPANT,
				correlationId: "corr-participant-list",
			},
			{
				...ready,
				authorization: createGrantingHumanResourcesAuthorization([
					HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ASSIGNED_READ,
					HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
				]),
			},
		);
		expect(listed.ok).toBe(true);
		if (!listed.ok) return;
		expect(listed.data.cases).toHaveLength(1);
		const row = listed.data.cases[0];
		expect(row?.employeeId).toBe(subjectEmployee.id);
		expect(row?.allegationSummary).toBeUndefined();
		expect(row?.findingSummary).toBeUndefined();
		expect(row?.classificationCode).toBeUndefined();
	});

	it("allows exceptional admin history without participant relationship", async () => {
		const ready = harness([
			...ER_PERMISSIONS,
			HUMAN_RESOURCES_PERMISSION_COMPLIANCE_ADMINISTER,
		]);
		const { subjectEmployee, employment } = await seedCaseActors(ready);
		const opened = await openSeededCase(ready, {
			employeeId: subjectEmployee.id,
			employmentId: employment.id,
		});
		expect(opened.ok).toBe(true);
		if (!opened.ok) return;

		const history = await getEmployeeRelationsHistoryByEmployee(
			{
				organizationId: ORG,
				actorUserId: ADMIN,
				correlationId: "corr-admin-history",
				employeeId: subjectEmployee.id,
			},
			ready,
		);
		expect(history.ok).toBe(true);
		if (!history.ok) return;
		expect(history.data.totalCount).toBeGreaterThanOrEqual(1);
		expect(history.data.cases.some((item) => item.id === opened.data.id)).toBe(
			true,
		);
	});

	it("rejects cross-organization list visibility", async () => {
		const ready = harness();
		const { subjectEmployee, employment } = await seedCaseActors(ready);
		const opened = await openSeededCase(ready, {
			employeeId: subjectEmployee.id,
			employmentId: employment.id,
		});
		expect(opened.ok).toBe(true);
		if (!opened.ok) return;

		const crossOrg = await listEmployeeCases(
			{
				organizationId: OTHER_ORG,
				actorUserId: OWNER,
				correlationId: "corr-cross-org-list",
			},
			ready,
		);
		expect(crossOrg.ok).toBe(false);
		expect(humanResourcesCodeFromResult(crossOrg)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);
	});

	it("keeps direct read and list visibility consistent", async () => {
		const ready = harness();
		const { subjectEmployee, employment } = await seedCaseActors(ready);
		const opened = await openSeededCase(ready, {
			employeeId: subjectEmployee.id,
			employmentId: employment.id,
		});
		expect(opened.ok).toBe(true);
		if (!opened.ok) return;

		const direct = await getEmployeeCaseById(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-direct",
				caseId: opened.data.id,
			},
			ready,
		);
		expect(direct.ok).toBe(true);

		const listed = await listOpenEmployeeRelationsCases(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-open-list",
			},
			ready,
		);
		expect(listed.ok).toBe(true);
		if (!listed.ok) return;
		expect(listed.data.cases.some((item) => item.id === opened.data.id)).toBe(
			direct.ok,
		);

		const deniedDirect = await getEmployeeCaseById(
			{
				organizationId: ORG,
				actorUserId: OUTSIDER,
				correlationId: "corr-denied-direct",
				caseId: opened.data.id,
			},
			{
				...ready,
				authorization: createGrantingHumanResourcesAuthorization([
					HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ASSIGNED_READ,
				]),
			},
		);
		expect(deniedDirect.ok).toBe(false);

		const deniedList = await listEmployeeCases(
			{
				organizationId: ORG,
				actorUserId: OUTSIDER,
				correlationId: "corr-denied-list",
			},
			{
				...ready,
				authorization: createGrantingHumanResourcesAuthorization([
					HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CASE_ASSIGNED_READ,
				]),
			},
		);
		expect(deniedList.ok).toBe(false);
		expect(humanResourcesCodeFromResult(deniedList)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);
	});

	it("paginates authorized rows after access filtering", async () => {
		const ready = harness();
		const { subjectEmployee, employment } = await seedCaseActors(ready);

		for (let index = 0; index < 3; index += 1) {
			const opened = await openSeededCase(ready, {
				employeeId: subjectEmployee.id,
				employmentId: employment.id,
			});
			expect(opened.ok).toBe(true);
		}

		const pageOne = await listEmployeeCases(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-page-1",
				page: 1,
				pageSize: 2,
			},
			ready,
		);
		expect(pageOne.ok).toBe(true);
		if (!pageOne.ok) return;
		expect(pageOne.data.totalCount).toBe(3);
		expect(pageOne.data.cases).toHaveLength(2);

		const pageTwo = await listEmployeeCases(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-page-2",
				page: 2,
				pageSize: 2,
			},
			ready,
		);
		expect(pageTwo.ok).toBe(true);
		if (!pageTwo.ok) return;
		expect(pageTwo.data.totalCount).toBe(3);
		expect(pageTwo.data.cases).toHaveLength(1);
	});

	it("requires identity resolver port for list queries", async () => {
		const ready = harness();
		const { subjectEmployee, employment } = await seedCaseActors(ready);
		const opened = await openSeededCase(ready, {
			employeeId: subjectEmployee.id,
			employmentId: employment.id,
		});
		expect(opened.ok).toBe(true);
		if (!opened.ok) return;

		const listed = await listEmployeeCases(
			{
				organizationId: ORG,
				actorUserId: OWNER,
				correlationId: "corr-no-resolver",
			},
			{ ...ready, identityResolver: undefined },
		);
		expect(listed.ok).toBe(false);
		expect(humanResourcesCodeFromResult(listed)).toBe(
			HUMAN_RESOURCES_ERROR_UNAUTHORIZED,
		);
	});
});
