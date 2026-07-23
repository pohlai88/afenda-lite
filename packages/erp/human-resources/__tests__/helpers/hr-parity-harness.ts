import { randomUUID } from "node:crypto";

import { createDrizzleHumanResourcesStore } from "../../src/adapters/drizzle";
import { createDrizzleAssignmentContextQuery } from "../../src/adapters/drizzle/assignment-context-query";
import { createEmployee } from "../../src/core/employee";
import { createEmployment } from "../../src/core/employment";
import type { HumanResourcesCommandOptions } from "../../src/command-options";
import { grantLeaveEntitlement } from "../../src/leave/entitlement";
import {
	createLeavePolicy,
	publishLeavePolicy,
} from "../../src/leave/leave-policy";
import { createDraftLeaveRequest } from "../../src/leave/leave-request";
import {
	HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_CREATE,
} from "../../src/module-ids";
import { HUMAN_RESOURCES_PERMISSION_CODES } from "../../src/permissions";
import { buildMutationMeta } from "../../src/shared/mutation-meta";
import type {
	Employee,
	Employment,
	LeaveEntitlement,
	LeavePolicy,
	LeaveRequest,
} from "../../src/types";
import {
	createMemoryHumanResourcesStore,
	createStoreAssignmentContextQuery,
} from "../../src/testing";
import type { HumanResourcesMutationMeta } from "../../src/shared/mutation-meta";
import type { MutationPorts } from "../../src/ports";
import { createTestHumanResourcesCommandOptions } from "./command-options";
import { createStoreBackedIdentityResolver } from "./identity-resolver";
import { createGrantingHumanResourcesAuthorization } from "./memory-authorization";
import { createMemoryMutationPorts } from "./memory-ports";
import { seedDepartmentAndJob } from "./seed-department-and-job";

export { seedDepartmentAndJob };

export type WorkforceStoreAdapter = "memory" | "drizzle";

export type WorkforceHarness = HumanResourcesCommandOptions & {
	adapter: WorkforceStoreAdapter;
	ports: ReturnType<typeof createMemoryMutationPorts>;
};

export type TestEmployee = Employee;
export type TestEmployment = Employment;
export type TestLeavePolicy = LeavePolicy;
export type TestLeaveEntitlement = LeaveEntitlement;
export type TestLeaveRequest = LeaveRequest;

export type WorkforceTestHarness = {
	organizationId: string;
	actorUserId: string;
	ports: MutationPorts;
	meta: HumanResourcesMutationMeta;
	store: ReturnType<typeof createDrizzleHumanResourcesStore>;
	commandOptions: WorkforceHarness;
	createEmployee: (options?: {
		employeeNumber?: string;
		legalName?: string;
	}) => Promise<TestEmployee>;
	createEmployment: (employee: TestEmployee) => Promise<TestEmployment>;
	createLeavePolicy: (options?: { status?: "draft" | "published" }) => Promise<TestLeavePolicy>;
	createLeaveEntitlement: (
		employee: TestEmployee,
		employment: TestEmployment,
		policy: TestLeavePolicy,
		options?: { status?: "active" | "expired" | "carried_forward" },
	) => Promise<TestLeaveEntitlement>;
	createLeaveRequest: (
		employee: TestEmployee,
		employment: TestEmployment,
		entitlement: TestLeaveEntitlement,
		policy: TestLeavePolicy,
		options?: { requestedQuantity?: string; startDate?: string; endDate?: string },
	) => Promise<TestLeaveRequest>;
};

/** Shared Memory / Drizzle harness for HR domain semantic parity suites. */
export function createHrParityHarness(
	adapter: WorkforceStoreAdapter,
): WorkforceHarness {
	const store =
		adapter === "memory"
			? createMemoryHumanResourcesStore()
			: createDrizzleHumanResourcesStore();
	const ports = createMemoryMutationPorts();
	const authorization = createGrantingHumanResourcesAuthorization([
		...HUMAN_RESOURCES_PERMISSION_CODES,
	]);
	const identityResolver = createStoreBackedIdentityResolver(store);
	const assignmentContext =
		adapter === "memory"
			? createStoreAssignmentContextQuery({ store })
			: createDrizzleAssignmentContextQuery();
	return {
		...createTestHumanResourcesCommandOptions({
			store,
			ports,
			authorization,
			identityResolver,
			assignmentContext,
		}),
		adapter,
		ports,
	};
}

/** Drizzle-only harness for leave concurrency and failure-injection tests. */
export async function createTestHarness(): Promise<WorkforceTestHarness> {
	const commandOptions = createHrParityHarness("drizzle");
	const organizationId = `org-hr-leave-test-${Date.now()}-${randomUUID().slice(0, 8)}`;
	const actorUserId = `user-hr-leave-test-${randomUUID().slice(0, 8)}`;
	const correlationId = randomUUID();

	const meta = buildMutationMeta({
		correlationId,
		operation: HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_CREATE,
	});

	async function createHarnessEmployee(options?: {
		employeeNumber?: string;
		legalName?: string;
	}): Promise<TestEmployee> {
		const employeeNumber = options?.employeeNumber ?? `E-${randomUUID().slice(0, 8)}`;
		const legalName = options?.legalName ?? "Test Employee";
		const created = await createEmployee(
			{
				organizationId,
				actorUserId,
				correlationId: randomUUID(),
				idempotencyKey: `idem-emp-${randomUUID()}`,
				employeeNumber,
				legalName,
			},
			commandOptions,
		);
		if (!created.ok) {
			throw new Error(`createEmployee failed: ${created.code} ${created.message}`);
		}
		return created.data;
	}

	async function createHarnessEmployment(employee: TestEmployee): Promise<TestEmployment> {
		const created = await createEmployment(
			{
				organizationId,
				actorUserId,
				correlationId: randomUUID(),
				employeeId: employee.id,
				startsOn: "2024-01-01",
			},
			commandOptions,
		);
		if (!created.ok) {
			throw new Error(`createEmployment failed: ${created.code} ${created.message}`);
		}
		return created.data;
	}

	async function createHarnessLeavePolicy(options?: {
		status?: "draft" | "published";
	}): Promise<TestLeavePolicy> {
		const code = `POL-${randomUUID().slice(0, 8)}`;
		const created = await createLeavePolicy(
			{
				organizationId,
				actorUserId,
				correlationId: randomUUID(),
				code,
				name: "Test Leave Policy",
				leaveType: "annual",
				unit: "days",
				paid: true,
				allowSelfApproval: true,
				effectiveFrom: "2024-01-01",
				allowedEmploymentStatuses: ["active"],
			},
			commandOptions,
		);
		if (!created.ok) {
			throw new Error(`createLeavePolicy failed: ${created.code} ${created.message}`);
		}
		if (options?.status === "draft") {
			return created.data;
		}
		const published = await publishLeavePolicy(
			{
				organizationId,
				actorUserId,
				correlationId: randomUUID(),
				policyId: created.data.id,
				expectedVersion: created.data.version,
			},
			commandOptions,
		);
		if (!published.ok) {
			throw new Error(`publishLeavePolicy failed: ${published.code} ${published.message}`);
		}
		return published.data;
	}

	async function createHarnessLeaveEntitlement(
		employee: TestEmployee,
		employment: TestEmployment,
		policy: TestLeavePolicy,
		options?: {
			status?: "active" | "expired" | "carried_forward";
			openingQuantity?: string;
			periodStart?: string;
			periodEnd?: string;
		},
	): Promise<TestLeaveEntitlement> {
		const granted = await grantLeaveEntitlement(
			{
				organizationId,
				actorUserId,
				correlationId: randomUUID(),
				employeeId: employee.id,
				employmentId: employment.id,
				policyId: policy.id,
				periodStart: options?.periodStart ?? "2024-01-01",
				periodEnd: options?.periodEnd ?? "2024-12-31",
				openingQuantity: options?.openingQuantity ?? "10",
				idempotencyKey: `idem-ent-${randomUUID()}`,
			},
			commandOptions,
		);
		if (!granted.ok) {
			throw new Error(`grantLeaveEntitlement failed: ${granted.code} ${granted.message}`);
		}
		return granted.data;
	}

	async function createHarnessLeaveRequest(
		employee: TestEmployee,
		employment: TestEmployment,
		entitlement: TestLeaveEntitlement,
		policy: TestLeavePolicy,
		options?: { requestedQuantity?: string; startDate?: string; endDate?: string },
	): Promise<TestLeaveRequest> {
		const requestedQuantity = options?.requestedQuantity ?? "5";
		const startDate = options?.startDate ?? "2024-01-15";
		const endDate =
			options?.endDate ??
			(requestedQuantity === "5" ? "2024-01-19" : startDate);
		const created = await createDraftLeaveRequest(
			{
				organizationId,
				actorUserId,
				correlationId: randomUUID(),
				employeeId: employee.id,
				entitlementId: entitlement.id,
				startDate,
				endDate,
				requestedQuantity,
				idempotencyKey: `idem-req-${randomUUID()}`,
			},
			commandOptions,
		);
		if (!created.ok) {
			throw new Error(
				`createDraftLeaveRequest failed: ${created.code} ${created.message}`,
			);
		}
		return created.data;
	}

	return {
		organizationId,
		actorUserId,
		ports: commandOptions.ports,
		meta,
		store: commandOptions.store as ReturnType<typeof createDrizzleHumanResourcesStore>,
		commandOptions,
		createEmployee: createHarnessEmployee,
		createEmployment: createHarnessEmployment,
		createLeavePolicy: createHarnessLeavePolicy,
		createLeaveEntitlement: createHarnessLeaveEntitlement,
		createLeaveRequest: createHarnessLeaveRequest,
	};
}
