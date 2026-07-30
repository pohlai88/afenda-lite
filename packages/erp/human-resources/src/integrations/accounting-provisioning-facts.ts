import { fail, ok, type Result } from "@afenda/errors/result";
import {
	type DomainEvent,
	HUMAN_RESOURCES_ASSIGNMENT_CREATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT,
	HUMAN_RESOURCES_OFFBOARDING_STARTED_EVENT,
	HUMAN_RESOURCES_ONBOARDING_STARTED_EVENT,
	HUMAN_RESOURCES_TIME_PAYROLL_HANDOFF_READY_EVENT,
	humanResourcesEntityPayloadSchema,
} from "@afenda/events";
import {
	HUMAN_RESOURCES_HEADCOUNT_PLAN_APPROVED_EVENT,
	HUMAN_RESOURCES_HEADCOUNT_RESERVATION_CONSUMED_EVENT,
	HUMAN_RESOURCES_HEADCOUNT_RESERVATION_RELEASED_EVENT,
	HUMAN_RESOURCES_HEADCOUNT_RESERVED_EVENT,
} from "@afenda/events/schemas";

const ALLOCATION_PERCENTAGE_PATTERN =
	/^(?:100(?:\.0{1,4})?|[0-9]{1,2}(?:\.[0-9]{1,4})?)$/;

interface IntegrationFactBase {
	correlationId: string;
	eventId: string;
	factVersion: 1;
	idempotencyKey: string;
	organizationId: string;
}

export type HumanResourcesPayrollPostingFact = IntegrationFactBase & {
	kind: "payroll_posting";
	payrollHandoffId: string;
	approvalEvidenceId: string;
};

export type HumanResourcesCostCentreAllocationFact = IntegrationFactBase & {
	kind: "cost_centre_allocation";
	assignmentId: string;
	costCentreId: string;
	allocationPercentage: string;
};

export type HumanResourcesHeadcountBudgetFact = IntegrationFactBase & {
	kind: "headcount_budget";
	workforcePlanEntityId: string;
	action: "approve" | "reserve" | "release" | "consume";
};

export type HumanResourcesAccessProvisioningFact = IntegrationFactBase & {
	kind: "access_provisioning";
	employeeEntityId: string;
	action: "grant" | "reconcile" | "revoke";
};

export type HumanResourcesEquipmentAssignmentFact = IntegrationFactBase & {
	kind: "equipment_assignment";
	employeeEntityId: string;
	action: "assign" | "recover";
};

export type HumanResourcesAccountingProvisioningFact =
	| HumanResourcesPayrollPostingFact
	| HumanResourcesCostCentreAllocationFact
	| HumanResourcesHeadcountBudgetFact
	| HumanResourcesAccessProvisioningFact
	| HumanResourcesEquipmentAssignmentFact;

function requiredMetadataString(
	event: DomainEvent,
	key: string,
): Result<string> {
	const value = event.metadata?.[key];
	if (typeof value !== "string" || value.trim().length === 0) {
		return fail(
			"VALIDATION_ERROR",
			`Human Resources integration metadata ${key} is required`,
		);
	}
	return ok(value.trim());
}

function baseFact(event: DomainEvent, kind: string): IntegrationFactBase {
	return {
		factVersion: 1,
		eventId: event.id,
		organizationId: event.organizationId,
		correlationId: event.correlationId,
		idempotencyKey: `event:${event.id}:${kind}`,
	};
}

const HEADCOUNT_ACTIONS = {
	[HUMAN_RESOURCES_HEADCOUNT_PLAN_APPROVED_EVENT]: "approve",
	[HUMAN_RESOURCES_HEADCOUNT_RESERVED_EVENT]: "reserve",
	[HUMAN_RESOURCES_HEADCOUNT_RESERVATION_RELEASED_EVENT]: "release",
	[HUMAN_RESOURCES_HEADCOUNT_RESERVATION_CONSUMED_EVENT]: "consume",
} as const;

const ACCESS_ACTIONS = {
	[HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT]: "grant",
	[HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT]: "reconcile",
	[HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT]: "revoke",
} as const;

export function projectHumanResourcesAccountingProvisioningFacts(
	event: DomainEvent,
): Result<readonly HumanResourcesAccountingProvisioningFact[]> {
	const payload = humanResourcesEntityPayloadSchema.safeParse(event.payload);
	if (!payload.success) {
		return fail("VALIDATION_ERROR", "Human Resources event payload is invalid");
	}
	if (
		payload.data.organizationId !== event.organizationId ||
		payload.data.correlationId !== event.correlationId
	) {
		return fail(
			"VALIDATION_ERROR",
			"Human Resources event envelope does not match its payload",
		);
	}

	if (event.type === HUMAN_RESOURCES_TIME_PAYROLL_HANDOFF_READY_EVENT) {
		const approvalEvidenceId = requiredMetadataString(
			event,
			"approvalEvidenceId",
		);
		if (!approvalEvidenceId.ok) {
			return approvalEvidenceId;
		}
		return ok([
			{
				...baseFact(event, "payroll-posting"),
				kind: "payroll_posting",
				payrollHandoffId: payload.data.entityId,
				approvalEvidenceId: approvalEvidenceId.data,
			},
		]);
	}

	if (
		event.type === HUMAN_RESOURCES_ASSIGNMENT_CREATED_EVENT ||
		event.type === HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT
	) {
		const costCentreId = requiredMetadataString(event, "costCentreId");
		if (!costCentreId.ok) {
			return costCentreId;
		}
		const allocationPercentage = requiredMetadataString(
			event,
			"allocationPercentage",
		);
		if (!allocationPercentage.ok) {
			return allocationPercentage;
		}
		if (!ALLOCATION_PERCENTAGE_PATTERN.test(allocationPercentage.data)) {
			return fail(
				"VALIDATION_ERROR",
				"Cost-centre allocation percentage is invalid",
			);
		}
		return ok([
			{
				...baseFact(event, "cost-centre-allocation"),
				kind: "cost_centre_allocation",
				assignmentId: payload.data.entityId,
				costCentreId: costCentreId.data,
				allocationPercentage: allocationPercentage.data,
			},
		]);
	}

	const headcountAction =
		HEADCOUNT_ACTIONS[event.type as keyof typeof HEADCOUNT_ACTIONS];
	if (headcountAction !== undefined) {
		return ok([
			{
				...baseFact(event, "headcount-budget"),
				kind: "headcount_budget",
				workforcePlanEntityId: payload.data.entityId,
				action: headcountAction,
			},
		]);
	}

	const accessAction =
		ACCESS_ACTIONS[event.type as keyof typeof ACCESS_ACTIONS];
	if (accessAction !== undefined) {
		return ok([
			{
				...baseFact(event, "access-provisioning"),
				kind: "access_provisioning",
				employeeEntityId: payload.data.entityId,
				action: accessAction,
			},
		]);
	}

	if (
		event.type === HUMAN_RESOURCES_ONBOARDING_STARTED_EVENT ||
		event.type === HUMAN_RESOURCES_OFFBOARDING_STARTED_EVENT
	) {
		return ok([
			{
				...baseFact(event, "equipment-assignment"),
				kind: "equipment_assignment",
				employeeEntityId: payload.data.entityId,
				action:
					event.type === HUMAN_RESOURCES_ONBOARDING_STARTED_EVENT
						? "assign"
						: "recover",
			},
		]);
	}

	return ok([]);
}
