import {
	HUMAN_RESOURCES_ASSIGNMENT_CREATED_EVENT,
	HUMAN_RESOURCES_ASSIGNMENT_ENDED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_REHIRED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_CHANGED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_CHANGED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_CREATED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_SUPERSEDED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT,
} from "@afenda/events/schemas";

import {
	HUMAN_RESOURCES_COMMAND_ASSIGNMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_ASSIGNMENT_END,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_AMEND,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CORRECT,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CREATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_END,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CORRECT,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CREATE,
	type HumanResourcesEmploymentLifecycleCommandId,
} from "../../module-ids";
import { defineDomainEventEmission } from "../define-emission";
import type { HumanResourcesMutationEmissionDefinition } from "../types";

export const HUMAN_RESOURCES_EMPLOYMENT_LIFECYCLE_EMISSIONS = {
	[HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CREATE]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CREATE,
		{
			domain: "employment-lifecycle",
			aggregateType: "employment",
			eventTypes: [
				HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT,
				HUMAN_RESOURCES_EMPLOYEE_REHIRED_EVENT,
			] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_EMPLOYMENT_AMEND]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_EMPLOYMENT_AMEND,
		{
			domain: "employment-lifecycle",
			aggregateType: "employment",
			eventTypes: [
				HUMAN_RESOURCES_EMPLOYMENT_CHANGED_EVENT,
				HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
			] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CORRECT]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CORRECT,
		{
			domain: "employment-lifecycle",
			aggregateType: "employment",
			eventTypes: [HUMAN_RESOURCES_EMPLOYMENT_CHANGED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CREATE]:
		defineDomainEventEmission(
			HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CREATE,
			{
				domain: "employment-lifecycle",
				aggregateType: "employment_contract",
				eventTypes: [
					HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_CREATED_EVENT,
				] as const,
			},
		),
	[HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CORRECT]:
		defineDomainEventEmission(
			HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CORRECT,
			{
				domain: "employment-lifecycle",
				aggregateType: "employment_contract",
				eventTypes: [
					HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_CHANGED_EVENT,
				] as const,
			},
		),
	[HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_SUPERSEDE]:
		defineDomainEventEmission(
			HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_SUPERSEDE,
			{
				domain: "employment-lifecycle",
				aggregateType: "employment_contract",
				eventTypes: [
					HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_SUPERSEDED_EVENT,
					HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_CREATED_EVENT,
				] as const,
			},
		),
	[HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_END]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_END,
		{
			domain: "employment-lifecycle",
			aggregateType: "employment_contract",
			eventTypes: [HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_CHANGED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_ASSIGNMENT_CREATE]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_ASSIGNMENT_CREATE,
		{
			domain: "employment-lifecycle",
			aggregateType: "assignment",
			eventTypes: [HUMAN_RESOURCES_ASSIGNMENT_CREATED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_ASSIGNMENT_END]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_ASSIGNMENT_END,
		{
			domain: "employment-lifecycle",
			aggregateType: "assignment",
			eventTypes: [HUMAN_RESOURCES_ASSIGNMENT_ENDED_EVENT] as const,
		},
	),
} satisfies Partial<
	Record<
		HumanResourcesEmploymentLifecycleCommandId,
		HumanResourcesMutationEmissionDefinition
	>
>;
