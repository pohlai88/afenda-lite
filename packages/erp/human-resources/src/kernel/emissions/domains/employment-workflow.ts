import {
	HUMAN_RESOURCES_CLEARANCE_COMPLETED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_CONFIRMED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
	HUMAN_RESOURCES_OFFBOARDING_COMPLETED_EVENT,
	HUMAN_RESOURCES_OFFBOARDING_STARTED_EVENT,
	HUMAN_RESOURCES_ONBOARDING_COMPLETED_EVENT,
	HUMAN_RESOURCES_ONBOARDING_STARTED_EVENT,
	HUMAN_RESOURCES_PROBATION_ASSESSMENT_RECORDED_EVENT,
	HUMAN_RESOURCES_PROBATION_EXTENDED_EVENT,
	HUMAN_RESOURCES_PROBATION_REVIEWED_EVENT,
} from "@afenda/events/schemas";

import {
	HUMAN_RESOURCES_COMMAND_ASSIGNMENT_TRANSFER,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONFIRM,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_COMPLETE,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_COMPLETE_TASK,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_ACCESS_REVOCATION,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_CLEARANCE,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_EXIT_INTERVIEW,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_PAYROLL_HANDOFF,
	HUMAN_RESOURCES_COMMAND_OFFBOARDING_START,
	HUMAN_RESOURCES_COMMAND_ONBOARDING_COMPLETE,
	HUMAN_RESOURCES_COMMAND_ONBOARDING_COMPLETE_TASK,
	HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_ACCESS_HANDOFF,
	HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_EQUIPMENT_HANDOFF,
	HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_ORIENTATION,
	HUMAN_RESOURCES_COMMAND_ONBOARDING_START,
	HUMAN_RESOURCES_COMMAND_PROBATION_EXTEND,
	HUMAN_RESOURCES_COMMAND_PROBATION_OPEN,
	HUMAN_RESOURCES_COMMAND_PROBATION_RECORD_ASSESSMENT,
	HUMAN_RESOURCES_COMMAND_PROBATION_RECORD_OUTCOME,
	HUMAN_RESOURCES_COMMAND_TERMINATION_APPROVE,
	HUMAN_RESOURCES_COMMAND_TERMINATION_FINALIZE,
	HUMAN_RESOURCES_COMMAND_TERMINATION_PROPOSE,
	type HumanResourcesEmploymentLifecycleCommandId,
} from "../../operations/module-ids";

import {
	defineAuditOnlyEmission,
	defineDomainEventEmission,
} from "../define-emission";
import type { HumanResourcesMutationEmissionDefinition } from "../types";

export const HUMAN_RESOURCES_EMPLOYMENT_WORKFLOW_EMISSIONS = {
	[HUMAN_RESOURCES_COMMAND_ONBOARDING_START]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_ONBOARDING_START,
		{
			domain: "employment-lifecycle",
			aggregateType: "onboarding_case",
			eventTypes: [HUMAN_RESOURCES_ONBOARDING_STARTED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_ONBOARDING_COMPLETE_TASK]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_ONBOARDING_COMPLETE_TASK,
		{
			domain: "employment-lifecycle",
			aggregateType: "onboarding_task",
		},
	),
	[HUMAN_RESOURCES_COMMAND_ONBOARDING_COMPLETE]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_ONBOARDING_COMPLETE,
		{
			domain: "employment-lifecycle",
			aggregateType: "onboarding_case",
			eventTypes: [HUMAN_RESOURCES_ONBOARDING_COMPLETED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_ORIENTATION]:
		defineAuditOnlyEmission(
			HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_ORIENTATION,
			{
				domain: "employment-lifecycle",
				aggregateType: "onboarding_orientation",
			},
		),
	[HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_EQUIPMENT_HANDOFF]:
		defineAuditOnlyEmission(
			HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_EQUIPMENT_HANDOFF,
			{
				domain: "employment-lifecycle",
				aggregateType: "onboarding_equipment_handoff",
			},
		),
	[HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_ACCESS_HANDOFF]:
		defineAuditOnlyEmission(
			HUMAN_RESOURCES_COMMAND_ONBOARDING_RECORD_ACCESS_HANDOFF,
			{
				domain: "employment-lifecycle",
				aggregateType: "onboarding_access_handoff",
			},
		),
	[HUMAN_RESOURCES_COMMAND_PROBATION_OPEN]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_PROBATION_OPEN,
		{
			domain: "employment-lifecycle",
			aggregateType: "probation_review",
		},
	),
	[HUMAN_RESOURCES_COMMAND_PROBATION_EXTEND]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_PROBATION_EXTEND,
		{
			domain: "employment-lifecycle",
			aggregateType: "probation_review",
			eventTypes: [HUMAN_RESOURCES_PROBATION_EXTENDED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_PROBATION_RECORD_OUTCOME]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_PROBATION_RECORD_OUTCOME,
		{
			domain: "employment-lifecycle",
			aggregateType: "probation_review",
			eventTypes: [HUMAN_RESOURCES_PROBATION_REVIEWED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_PROBATION_RECORD_ASSESSMENT]:
		defineDomainEventEmission(
			HUMAN_RESOURCES_COMMAND_PROBATION_RECORD_ASSESSMENT,
			{
				domain: "employment-lifecycle",
				aggregateType: "probation_assessment",
				eventTypes: [
					HUMAN_RESOURCES_PROBATION_ASSESSMENT_RECORDED_EVENT,
				] as const,
			},
		),
	[HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONFIRM]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONFIRM,
		{
			domain: "employment-lifecycle",
			aggregateType: "employment_confirmation",
			eventTypes: [HUMAN_RESOURCES_EMPLOYEE_CONFIRMED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_ASSIGNMENT_TRANSFER]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_ASSIGNMENT_TRANSFER,
		{
			domain: "employment-lifecycle",
			aggregateType: "employment_movement",
			eventTypes: [HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_TERMINATION_PROPOSE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_TERMINATION_PROPOSE,
		{
			domain: "employment-lifecycle",
			aggregateType: "termination",
		},
	),
	[HUMAN_RESOURCES_COMMAND_TERMINATION_APPROVE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_TERMINATION_APPROVE,
		{
			domain: "employment-lifecycle",
			aggregateType: "termination",
		},
	),
	[HUMAN_RESOURCES_COMMAND_TERMINATION_FINALIZE]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_TERMINATION_FINALIZE,
		{
			domain: "employment-lifecycle",
			aggregateType: "termination",
			eventTypes: [HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_OFFBOARDING_START]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_OFFBOARDING_START,
		{
			domain: "employment-lifecycle",
			aggregateType: "offboarding_case",
			eventTypes: [HUMAN_RESOURCES_OFFBOARDING_STARTED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_OFFBOARDING_COMPLETE_TASK]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_OFFBOARDING_COMPLETE_TASK,
		{
			domain: "employment-lifecycle",
			aggregateType: "offboarding_task",
		},
	),
	[HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_EXIT_INTERVIEW]:
		defineAuditOnlyEmission(
			HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_EXIT_INTERVIEW,
			{
				domain: "employment-lifecycle",
				aggregateType: "exit_interview",
			},
		),
	[HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_CLEARANCE]:
		defineDomainEventEmission(
			HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_CLEARANCE,
			{
				domain: "employment-lifecycle",
				aggregateType: "clearance",
				eventTypes: [HUMAN_RESOURCES_CLEARANCE_COMPLETED_EVENT] as const,
			},
		),
	[HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_ACCESS_REVOCATION]:
		defineAuditOnlyEmission(
			HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_ACCESS_REVOCATION,
			{
				domain: "employment-lifecycle",
				aggregateType: "offboarding_access_revocation",
			},
		),
	[HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_PAYROLL_HANDOFF]:
		defineAuditOnlyEmission(
			HUMAN_RESOURCES_COMMAND_OFFBOARDING_RECORD_PAYROLL_HANDOFF,
			{
				domain: "employment-lifecycle",
				aggregateType: "offboarding_payroll_handoff",
			},
		),
	[HUMAN_RESOURCES_COMMAND_OFFBOARDING_COMPLETE]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_OFFBOARDING_COMPLETE,
		{
			domain: "employment-lifecycle",
			aggregateType: "offboarding_case",
			eventTypes: [HUMAN_RESOURCES_OFFBOARDING_COMPLETED_EVENT] as const,
		},
	),
} satisfies Partial<
	Record<
		HumanResourcesEmploymentLifecycleCommandId,
		HumanResourcesMutationEmissionDefinition
	>
>;
