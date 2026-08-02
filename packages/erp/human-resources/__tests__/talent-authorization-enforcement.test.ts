/**
 * HR-ENT-TALENT-SENSITIVE-ENFORCE — talent domain routes through contextual authorization facade.
 */

import { describe, expect, it } from "vitest";
import {
	createCareerPlan,
	getCareerPlanById,
	listEmployeeCareerPlans,
} from "../src/features/talent/career-plan";
import { listSuccessionPlans } from "../src/features/talent/succession-plan";
import { createEmployee } from "../src/features/workforce-records/employment/employee";
import { createEmployment } from "../src/features/workforce-records/employment/employment";
import {
	HUMAN_RESOURCES_PERMISSION_CAREER_PLAN_MANAGE,
	HUMAN_RESOURCES_PERMISSION_CAREER_PLAN_OWN_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
	HUMAN_RESOURCES_PERMISSION_SUCCESSION_EXECUTIVE_READ,
	HUMAN_RESOURCES_PERMISSION_TALENT_ADMIN,
} from "../src/kernel/authorization/permissions";
import {
	HUMAN_RESOURCES_ERROR_AUTHORIZATION_DENIED,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
} from "../src/kernel/execution/error-codes";
import type { HumanResourcesEmployeeId } from "../src/kernel/identity/brands";
import { createMemoryHumanResourcesStore } from "../src/testing/index";
import { createTestHumanResourcesCommandOptions } from "./helpers/command-options";
import {
	createMappingIdentityResolver,
	createStoreBackedIdentityResolver,
	mapActorToEmployee,
} from "./helpers/identity-resolver";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { humanResourcesCodeFromResult } from "./helpers/result-details";

const ORG = "org-talent-auth-enforce";

function harness(permissions: readonly string[]) {
	const store = createMemoryHumanResourcesStore();
	const ports = createMemoryMutationPorts();
	const identityResolver = createStoreBackedIdentityResolver(store);
	return {
		store,
		ports,
		identityResolver,
		options: createTestHumanResourcesCommandOptions({
			store,
			ports,
			identityResolver,
			authorization: createGrantingHumanResourcesAuthorization(
				permissions as Parameters<
					typeof createGrantingHumanResourcesAuthorization
				>[0],
			),
		}),
	};
}

async function seedEmployee(
	ready: ReturnType<typeof harness>["options"],
	input: {
		actorUserId: string;
		employeeNumber: string;
		legalName: string;
	},
) {
	const employee = await createEmployee(
		{
			organizationId: ORG,
			actorUserId: input.actorUserId,
			correlationId: `corr-${input.employeeNumber}`,
			idempotencyKey: `idem-${input.employeeNumber}`,
			employeeNumber: input.employeeNumber,
			legalName: input.legalName,
		},
		{
			...ready,
			authorization: createGrantingHumanResourcesAuthorization([
				HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
				HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
			]),
		},
	);
	if (!employee.ok) {
		throw new Error(employee.message);
	}
	const employment = await createEmployment(
		{
			organizationId: ORG,
			actorUserId: input.actorUserId,
			correlationId: `corr-employ-${input.employeeNumber}`,
			employeeId: employee.data.id,
			startsOn: "2025-01-01",
		},
		{
			...ready,
			authorization: createGrantingHumanResourcesAuthorization([
				HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
				HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
			]),
		},
	);
	if (!employment.ok) {
		throw new Error(employment.message);
	}
	return employee.data;
}

describe("talent authorization enforcement (HR-ENT-TALENT-SENSITIVE-ENFORCE)", () => {
	it("denies cross-employee career plan list via facade subject scope", async () => {
		const adminReady = harness([
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
			HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
			HUMAN_RESOURCES_PERMISSION_CAREER_PLAN_MANAGE,
		]);

		const subject = await seedEmployee(adminReady.options, {
			actorUserId: "user-subject",
			employeeNumber: "E-SUBJECT",
			legalName: "Subject Employee",
		});
		const peer = await seedEmployee(adminReady.options, {
			actorUserId: "user-peer",
			employeeNumber: "E-PEER",
			legalName: "Peer Employee",
		});

		const plan = await createCareerPlan(
			{
				organizationId: ORG,
				actorUserId: "user-admin",
				correlationId: "corr-plan",
				idempotencyKey: "idem-plan",
				employeeId: peer.id,
				ownerUserId: "user-admin",
				code: "CP-1",
				title: "Peer plan",
			},
			{
				...adminReady.options,
				authorization: createGrantingHumanResourcesAuthorization([
					HUMAN_RESOURCES_PERMISSION_CAREER_PLAN_MANAGE,
					HUMAN_RESOURCES_PERMISSION_TALENT_ADMIN,
				]),
			},
		);
		expect(plan.ok).toBe(true);

		const identityResolver = createMappingIdentityResolver({
			"user-subject-viewer": subject.id as HumanResourcesEmployeeId,
		});
		await mapActorToEmployee(adminReady.store, {
			organizationId: ORG,
			userId: "user-subject-viewer",
			employeeId: subject.id as HumanResourcesEmployeeId,
			actorUserId: "user-admin",
		});

		const viewerReady = createTestHumanResourcesCommandOptions({
			store: adminReady.store,
			ports: adminReady.ports,
			authorization: createGrantingHumanResourcesAuthorization([
				HUMAN_RESOURCES_PERMISSION_CAREER_PLAN_OWN_READ,
			]),
			identityResolver,
		});

		const denied = await listEmployeeCareerPlans(
			{
				organizationId: ORG,
				actorUserId: "user-subject-viewer",
				correlationId: "corr-list-deny",
				employeeId: peer.id,
			},
			viewerReady,
		);
		expect(denied.ok).toBe(false);
		expect(humanResourcesCodeFromResult(denied)).toBe(
			HUMAN_RESOURCES_ERROR_AUTHORIZATION_DENIED,
		);

		const allowed = await listEmployeeCareerPlans(
			{
				organizationId: ORG,
				actorUserId: "user-subject-viewer",
				correlationId: "corr-list-allow",
				employeeId: subject.id,
			},
			viewerReady,
		);
		expect(allowed.ok).toBe(true);
	});

	it("allows talent admin to read another employee career plan", async () => {
		const adminReady = harness([
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
			HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
			HUMAN_RESOURCES_PERMISSION_CAREER_PLAN_MANAGE,
			HUMAN_RESOURCES_PERMISSION_TALENT_ADMIN,
			HUMAN_RESOURCES_PERMISSION_CAREER_PLAN_OWN_READ,
		]);

		const peer = await seedEmployee(adminReady.options, {
			actorUserId: "user-admin",
			employeeNumber: "E-ADMIN-TARGET",
			legalName: "Target Employee",
		});

		const created = await createCareerPlan(
			{
				organizationId: ORG,
				actorUserId: "user-admin",
				correlationId: "corr-admin-plan",
				idempotencyKey: "idem-admin-plan",
				employeeId: peer.id,
				ownerUserId: "user-admin",
				code: "CP-ADMIN",
				title: "Admin visible plan",
			},
			adminReady.options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const loaded = await getCareerPlanById(
			{
				organizationId: ORG,
				actorUserId: "user-admin",
				correlationId: "corr-admin-get",
				careerPlanId: created.data.id,
			},
			adminReady.options,
		);
		expect(loaded.ok).toBe(true);
		if (loaded.ok) {
			expect(loaded.data?.id).toBe(created.data.id);
		}
	});

	it("denies succession list without privileged succession permission", async () => {
		const ready = harness([HUMAN_RESOURCES_PERMISSION_CAREER_PLAN_OWN_READ]);

		const denied = await listSuccessionPlans(
			{
				organizationId: ORG,
				actorUserId: "user-no-succession",
				correlationId: "corr-succession-deny",
				page: 1,
				pageSize: 20,
			},
			ready.options,
		);
		expect(denied.ok).toBe(false);
		expect(humanResourcesCodeFromResult(denied)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);

		const allowed = await listSuccessionPlans(
			{
				organizationId: ORG,
				actorUserId: "user-succession-exec",
				correlationId: "corr-succession-allow",
				page: 1,
				pageSize: 20,
			},
			{
				...ready.options,
				authorization: createGrantingHumanResourcesAuthorization([
					HUMAN_RESOURCES_PERMISSION_SUCCESSION_EXECUTIVE_READ,
				]),
			},
		);
		expect(allowed.ok).toBe(true);
	});
});
