import { randomUUID } from "node:crypto";

import { createDrizzleHumanResourcesStore } from "../../src/composition/adapters/drizzle/index";
import { grantLeaveEntitlement } from "../../src/features/leave/entitlement";
import {
	createLeavePolicy,
	publishLeavePolicy,
} from "../../src/features/leave/leave-policy";
import { createDraftLeaveRequest } from "../../src/features/leave/leave-request";
import { createDrizzleAssignmentContextQuery } from "../../src/features/workforce-records/employment/adapters/assignment-context-query.drizzle";
import { createEmployee } from "../../src/features/workforce-records/employment/employee";
import { createEmployment } from "../../src/features/workforce-records/employment/employment";
import { HUMAN_RESOURCES_PERMISSION_CODES } from "../../src/kernel/authorization/permissions";
import type {
	Employee,
	Employment,
	LeaveEntitlement,
	LeavePolicy,
	LeaveRequest,
} from "../../src/kernel/contracts";
import type { HumanResourcesMutationMeta } from "../../src/kernel/emissions/mutation-meta";
import { buildMutationMeta } from "../../src/kernel/emissions/mutation-meta";
import type { HumanResourcesCommandOptions } from "../../src/kernel/execution/command-options";
import type { MutationPorts } from "../../src/kernel/execution/ports";
import { HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_CREATE } from "../../src/kernel/operations/module-ids";
import {
	createMemoryHumanResourcesStore,
	createStoreAssignmentContextQuery,
} from "../../src/testing/index";
import { createTestHumanResourcesCommandOptions } from "./command-options";
import { createDrizzleTestOrganizationDimensionDirectory } from "./drizzle-organization-dimensions";
import { createStoreBackedIdentityResolver } from "./identity-resolver";
import { createGrantingHumanResourcesAuthorization } from "./memory-authorization";
import { createMemoryMutationPorts } from "./memory-ports";

export { seedDepartmentAndJob } from "./seed-department-and-job";

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

export interface WorkforceTestHarness {
	actorUserId: string;
	commandOptions: WorkforceHarness;
	createEmployee: (options?: {
		employeeNumber?: string;
		legalName?: string;
	}) => Promise<TestEmployee>;
	createEmployment: (employee: TestEmployee) => Promise<TestEmployment>;
	createLeaveEntitlement: (
		employee: TestEmployee,
		employment: TestEmployment,
		policy: TestLeavePolicy,
		options?: { status?: "active" | "expired" | "carried_forward" },
	) => Promise<TestLeaveEntitlement>;
	createLeavePolicy: (options?: {
		status?: "draft" | "published";
	}) => Promise<TestLeavePolicy>;
	createLeaveRequest: (
		employee: TestEmployee,
		employment: TestEmployment,
		entitlement: TestLeaveEntitlement,
		policy: TestLeavePolicy,
		options?: {
			requestedQuantity?: string;
			startDate?: string;
			endDate?: string;
		},
	) => Promise<TestLeaveRequest>;
	meta: HumanResourcesMutationMeta;
	organizationId: string;
	ports: MutationPorts;
	store: ReturnType<typeof createDrizzleHumanResourcesStore>;
}

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
			...(adapter === "drizzle"
				? {
						organizationDimensions:
							createDrizzleTestOrganizationDimensionDirectory(),
					}
				: {}),
		}),
		adapter,
		ports,
	};
}

/** Drizzle-only harness for leave concurrency and failure-injection tests. */
export async function createTestHarness(options?: {
	trackOrg?: (organizationId: string) => void;
}): Promise<WorkforceTestHarness> {
	const commandOptions = createHrParityHarness("drizzle");
	const organizationId = `org-hr-leave-test-${Date.now()}-${randomUUID().slice(0, 8)}`;
	options?.trackOrg?.(organizationId);
	const actorUserId = `user-hr-leave-test-${randomUUID().slice(0, 8)}`;
	const correlationId = randomUUID();

	const meta = buildMutationMeta({
		correlationId,
		operationId: HUMAN_RESOURCES_COMMAND_LEAVE_POLICY_CREATE,
	});

	async function createHarnessEmployee(optionsValue2?: {
		employeeNumber?: string;
		legalName?: string;
	}): Promise<TestEmployee> {
		const employeeNumber =
			optionsValue2?.employeeNumber ?? `E-${randomUUID().slice(0, 8)}`;
		const legalName = optionsValue2?.legalName ?? "Test Employee";
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
			throw new Error(
				`createEmployee failed: ${created.code} ${created.message}`,
			);
		}
		return created.data;
	}

	async function createHarnessEmployment(
		employee: TestEmployee,
	): Promise<TestEmployment> {
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
			throw new Error(
				`createEmployment failed: ${created.code} ${created.message}`,
			);
		}
		return created.data;
	}

	async function createHarnessLeavePolicy(optionsValue4?: {
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
			throw new Error(
				`createLeavePolicy failed: ${created.code} ${created.message}`,
			);
		}
		if (optionsValue4?.status === "draft") {
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
			throw new Error(
				`publishLeavePolicy failed: ${published.code} ${published.message}`,
			);
		}
		return published.data;
	}

	async function createHarnessLeaveEntitlement(
		employee: TestEmployee,
		employment: TestEmployment,
		policy: TestLeavePolicy,
		optionsValue3?: {
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
				periodStart: optionsValue3?.periodStart ?? "2024-01-01",
				periodEnd: optionsValue3?.periodEnd ?? "2024-12-31",
				openingQuantity: optionsValue3?.openingQuantity ?? "10",
				idempotencyKey: `idem-ent-${randomUUID()}`,
			},
			commandOptions,
		);
		if (!granted.ok) {
			throw new Error(
				`grantLeaveEntitlement failed: ${granted.code} ${granted.message}`,
			);
		}
		return granted.data;
	}

	async function createHarnessLeaveRequest(
		employee: TestEmployee,
		_employment: TestEmployment,
		entitlement: TestLeaveEntitlement,
		_policy: TestLeavePolicy,
		optionsValue5?: {
			requestedQuantity?: string;
			startDate?: string;
			endDate?: string;
		},
	): Promise<TestLeaveRequest> {
		const requestedQuantity = optionsValue5?.requestedQuantity ?? "5";
		const startDate = optionsValue5?.startDate ?? "2024-01-15";
		const endDate =
			optionsValue5?.endDate ??
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

	return await {
		organizationId,
		actorUserId,
		ports: commandOptions.ports,
		meta,
		store: commandOptions.store as ReturnType<
			typeof createDrizzleHumanResourcesStore
		>,
		commandOptions,
		createEmployee: createHarnessEmployee,
		createEmployment: createHarnessEmployment,
		createLeavePolicy: createHarnessLeavePolicy,
		createLeaveEntitlement: createHarnessLeaveEntitlement,
		createLeaveRequest: createHarnessLeaveRequest,
	};
}
