import { createMemoryCurrencyLookup } from "../../src/features/compensation-benefits/currency-lookup";
import {
	approveEmployeeCompensation,
	createEmployeeCompensation,
} from "../../src/features/compensation-benefits/employee-compensation";
import { createEmployee } from "../../src/features/workforce-records/employment/employee";
import { createEmployment } from "../../src/features/workforce-records/employment/employment";
import type { HumanResourcesPermission } from "../../src/kernel/authorization/authorize";
import {
	HUMAN_RESOURCES_PERMISSION_CODES,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
} from "../../src/kernel/authorization/permissions";
import type { WorkAssignment } from "../../src/kernel/contracts";
import {
	parseHumanResourcesAssignmentId,
	parseHumanResourcesPositionId,
} from "../../src/kernel/identity/brands";
import { createMemoryHumanResourcesStore } from "../../src/testing/index";
import { createGrantingHumanResourcesAuthorization } from "./memory-authorization";
import { createMemoryMutationPorts } from "./memory-ports";

export const COMPENSATION_HANDOFF_PARITY_ORG = "org-cb-handoff-parity";
export const COMPENSATION_HANDOFF_PARITY_ACTOR = "user-cb-handoff-parity";
export const COMPENSATION_HANDOFF_PARITY_EFFECTIVE_DATE = "2025-01-01";

export function compensationHandoffParityHarness(
	permissions: readonly HumanResourcesPermission[] = HUMAN_RESOURCES_PERMISSION_CODES,
) {
	const store = createMemoryHumanResourcesStore();
	const ports = createMemoryMutationPorts();
	const authorization = createGrantingHumanResourcesAuthorization(permissions);
	const currency = createMemoryCurrencyLookup();
	return { store, ports, authorization, currency };
}

export function syntheticWorkAssignment(input: {
	organizationId: string;
	employmentId: string;
	employeeId: string;
}): WorkAssignment {
	const assignmentId = parseHumanResourcesAssignmentId(
		"00000000-0000-4000-8000-000000000101",
	);
	const positionId = parseHumanResourcesPositionId(
		"00000000-0000-4000-8000-000000000201",
	);
	if (!(assignmentId.ok && positionId.ok)) {
		throw new Error("Failed to parse synthetic assignment brands");
	}

	const now = new Date("2025-01-01T00:00:00.000Z");
	return {
		id: assignmentId.data,
		organizationId: input.organizationId,
		employmentId: input.employmentId as WorkAssignment["employmentId"],
		employeeId: input.employeeId as WorkAssignment["employeeId"],
		positionId: positionId.data,
		organizationDimensions: null,
		predecessorAssignmentId: null,
		successorAssignmentId: null,
		transferMovementId: null,
		managerEmployeeIdSnapshot: null,
		workCalendarIdSnapshot: null,
		startsOn: COMPENSATION_HANDOFF_PARITY_EFFECTIVE_DATE,
		endsOn: null,
		version: 1,
		createdBy: COMPENSATION_HANDOFF_PARITY_ACTOR,
		updatedBy: COMPENSATION_HANDOFF_PARITY_ACTOR,
		createdAt: now,
		updatedAt: now,
	};
}

export async function seedApprovedCompensationForHandoff(
	ready: ReturnType<typeof compensationHandoffParityHarness>,
	options: { baseAmount?: string; idempotencySuffix?: string } = {},
) {
	const suffix = options.idempotencySuffix ?? "default";
	const seedReady = {
		...ready,
		authorization: createGrantingHumanResourcesAuthorization([
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
			HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
		]),
	};

	const employee = await createEmployee(
		{
			organizationId: COMPENSATION_HANDOFF_PARITY_ORG,
			actorUserId: COMPENSATION_HANDOFF_PARITY_ACTOR,
			correlationId: `corr-emp-handoff-${suffix}`,
			idempotencyKey: `idem-emp-handoff-${suffix}`,
			employeeNumber: `E-HANDOFF-${suffix}`,
			legalName: "Handoff Worker",
		},
		seedReady,
	);
	if (!employee.ok) {
		return employee;
	}

	const employment = await createEmployment(
		{
			organizationId: COMPENSATION_HANDOFF_PARITY_ORG,
			actorUserId: COMPENSATION_HANDOFF_PARITY_ACTOR,
			correlationId: `corr-employ-handoff-${suffix}`,
			employeeId: employee.data.id,
			startsOn: COMPENSATION_HANDOFF_PARITY_EFFECTIVE_DATE,
		},
		seedReady,
	);
	if (!employment.ok) {
		return employment;
	}

	const compensation = await createEmployeeCompensation(
		{
			organizationId: COMPENSATION_HANDOFF_PARITY_ORG,
			actorUserId: COMPENSATION_HANDOFF_PARITY_ACTOR,
			correlationId: `corr-comp-handoff-${suffix}`,
			idempotencyKey: `idem-comp-handoff-${suffix}`,
			employeeId: employee.data.id,
			employmentId: employment.data.id,
			baseAmount: options.baseAmount ?? "85000.50",
			currencyCode: "USD",
			payFrequency: "monthly",
			effectiveFrom: COMPENSATION_HANDOFF_PARITY_EFFECTIVE_DATE,
			reason: "Initial hire",
		},
		ready,
	);
	if (!compensation.ok) {
		return compensation;
	}

	const approved = await approveEmployeeCompensation(
		{
			organizationId: COMPENSATION_HANDOFF_PARITY_ORG,
			actorUserId: COMPENSATION_HANDOFF_PARITY_ACTOR,
			correlationId: `corr-comp-approve-handoff-${suffix}`,
			compensationId: compensation.data.id,
			expectedVersion: compensation.data.version,
		},
		ready,
	);
	if (!approved.ok) {
		return approved;
	}

	return {
		ok: true as const,
		employee: employee.data,
		employment: employment.data,
		compensation: approved.data,
	};
}
