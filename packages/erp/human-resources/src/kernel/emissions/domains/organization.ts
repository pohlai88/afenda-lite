import {
	HUMAN_RESOURCES_DEPARTMENT_ACTIVATED_EVENT,
	HUMAN_RESOURCES_DEPARTMENT_ARCHIVED_EVENT,
	HUMAN_RESOURCES_JOB_ACTIVATED_EVENT,
	HUMAN_RESOURCES_JOB_ARCHIVED_EVENT,
	HUMAN_RESOURCES_POSITION_ACTIVATED_EVENT,
	HUMAN_RESOURCES_POSITION_CLOSED_EVENT,
	HUMAN_RESOURCES_POSITION_FROZEN_EVENT,
	HUMAN_RESOURCES_REPORTING_LINE_ASSIGNED_EVENT,
	HUMAN_RESOURCES_REPORTING_LINE_CLOSED_EVENT,
	HUMAN_RESOURCES_REPORTING_LINE_REPLACED_EVENT,
} from "@afenda/events/schemas";

import {
	HUMAN_RESOURCES_COMMAND_DEPARTMENT_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_DEPARTMENT_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_DEPARTMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_DEPARTMENT_UPDATE,
	HUMAN_RESOURCES_COMMAND_JOB_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_JOB_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_JOB_CREATE,
	HUMAN_RESOURCES_COMMAND_JOB_UPDATE,
	HUMAN_RESOURCES_COMMAND_POSITION_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_POSITION_CLOSE,
	HUMAN_RESOURCES_COMMAND_POSITION_CREATE,
	HUMAN_RESOURCES_COMMAND_POSITION_FREEZE,
	HUMAN_RESOURCES_COMMAND_POSITION_UPDATE,
	HUMAN_RESOURCES_COMMAND_REPORTING_LINE_ASSIGN_PRIMARY,
	HUMAN_RESOURCES_COMMAND_REPORTING_LINE_CLOSE,
	HUMAN_RESOURCES_COMMAND_REPORTING_LINE_REPLACE_PRIMARY,
	type HumanResourcesOrganizationCommandId,
} from "../../operations/module-ids";

import {
	defineAuditOnlyEmission,
	defineDomainEventEmission,
} from "../define-emission";
import type { HumanResourcesMutationEmissionDefinition } from "../types";

export const HUMAN_RESOURCES_ORGANIZATION_EMISSIONS = {
	[HUMAN_RESOURCES_COMMAND_DEPARTMENT_CREATE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_DEPARTMENT_CREATE,
		{
			domain: "organization",
			aggregateType: "department",
		},
	),
	[HUMAN_RESOURCES_COMMAND_DEPARTMENT_UPDATE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_DEPARTMENT_UPDATE,
		{
			domain: "organization",
			aggregateType: "department",
		},
	),
	[HUMAN_RESOURCES_COMMAND_DEPARTMENT_ACTIVATE]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_DEPARTMENT_ACTIVATE,
		{
			domain: "organization",
			aggregateType: "department",
			eventTypes: [HUMAN_RESOURCES_DEPARTMENT_ACTIVATED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_DEPARTMENT_ARCHIVE]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_DEPARTMENT_ARCHIVE,
		{
			domain: "organization",
			aggregateType: "department",
			eventTypes: [HUMAN_RESOURCES_DEPARTMENT_ARCHIVED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_JOB_CREATE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_JOB_CREATE,
		{
			domain: "organization",
			aggregateType: "job",
		},
	),
	[HUMAN_RESOURCES_COMMAND_JOB_UPDATE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_JOB_UPDATE,
		{
			domain: "organization",
			aggregateType: "job",
		},
	),
	[HUMAN_RESOURCES_COMMAND_JOB_ACTIVATE]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_JOB_ACTIVATE,
		{
			domain: "organization",
			aggregateType: "job",
			eventTypes: [HUMAN_RESOURCES_JOB_ACTIVATED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_JOB_ARCHIVE]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_JOB_ARCHIVE,
		{
			domain: "organization",
			aggregateType: "job",
			eventTypes: [HUMAN_RESOURCES_JOB_ARCHIVED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_POSITION_CREATE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_POSITION_CREATE,
		{
			domain: "organization",
			aggregateType: "position",
		},
	),
	[HUMAN_RESOURCES_COMMAND_POSITION_UPDATE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_POSITION_UPDATE,
		{
			domain: "organization",
			aggregateType: "position",
		},
	),
	[HUMAN_RESOURCES_COMMAND_POSITION_ACTIVATE]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_POSITION_ACTIVATE,
		{
			domain: "organization",
			aggregateType: "position",
			eventTypes: [HUMAN_RESOURCES_POSITION_ACTIVATED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_POSITION_FREEZE]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_POSITION_FREEZE,
		{
			domain: "organization",
			aggregateType: "position",
			eventTypes: [HUMAN_RESOURCES_POSITION_FROZEN_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_POSITION_CLOSE]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_POSITION_CLOSE,
		{
			domain: "organization",
			aggregateType: "position",
			eventTypes: [HUMAN_RESOURCES_POSITION_CLOSED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_REPORTING_LINE_ASSIGN_PRIMARY]:
		defineDomainEventEmission(
			HUMAN_RESOURCES_COMMAND_REPORTING_LINE_ASSIGN_PRIMARY,
			{
				domain: "organization",
				aggregateType: "reporting_line",
				eventTypes: [HUMAN_RESOURCES_REPORTING_LINE_ASSIGNED_EVENT] as const,
			},
		),
	[HUMAN_RESOURCES_COMMAND_REPORTING_LINE_CLOSE]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_REPORTING_LINE_CLOSE,
		{
			domain: "organization",
			aggregateType: "reporting_line",
			eventTypes: [HUMAN_RESOURCES_REPORTING_LINE_CLOSED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_REPORTING_LINE_REPLACE_PRIMARY]:
		defineDomainEventEmission(
			HUMAN_RESOURCES_COMMAND_REPORTING_LINE_REPLACE_PRIMARY,
			{
				domain: "organization",
				aggregateType: "reporting_line",
				eventTypes: [HUMAN_RESOURCES_REPORTING_LINE_REPLACED_EVENT] as const,
			},
		),
} satisfies Record<
	HumanResourcesOrganizationCommandId,
	HumanResourcesMutationEmissionDefinition
>;
