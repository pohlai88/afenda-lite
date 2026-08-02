import {
	HUMAN_RESOURCES_HEADCOUNT_PLAN_APPROVED_EVENT,
	HUMAN_RESOURCES_HEADCOUNT_RESERVATION_CONSUMED_EVENT,
	HUMAN_RESOURCES_HEADCOUNT_RESERVATION_RELEASED_EVENT,
	HUMAN_RESOURCES_HEADCOUNT_RESERVED_EVENT,
} from "@afenda/events/schemas";

import {
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_APPROVE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_CLOSE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_CREATE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_LINE_ADD,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_LINE_REMOVE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_LINE_UPDATE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_REJECT,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_SUBMIT,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_SUPERSEDE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_UPDATE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVATION_CONSUME,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVATION_RELEASE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVE,
	type HumanResourcesWorkforcePlanningCommandId,
} from "../../operations/module-ids";

import {
	defineAuditOnlyEmission,
	defineDomainEventEmission,
} from "../define-emission";
import type { HumanResourcesMutationEmissionDefinition } from "../types";

export const HUMAN_RESOURCES_WORKFORCE_PLANNING_EMISSIONS = {
	[HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_CREATE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_CREATE,
		{
			domain: "workforce-planning",
			aggregateType: "headcount_plan",
		},
	),
	[HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_UPDATE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_UPDATE,
		{
			domain: "workforce-planning",
			aggregateType: "headcount_plan",
		},
	),
	[HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_LINE_ADD]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_LINE_ADD,
		{
			domain: "workforce-planning",
			aggregateType: "headcount_plan_line",
		},
	),
	[HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_LINE_UPDATE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_LINE_UPDATE,
		{
			domain: "workforce-planning",
			aggregateType: "headcount_plan_line",
		},
	),
	[HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_LINE_REMOVE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_LINE_REMOVE,
		{
			domain: "workforce-planning",
			aggregateType: "headcount_plan_line",
		},
	),
	[HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_SUBMIT]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_SUBMIT,
		{
			domain: "workforce-planning",
			aggregateType: "headcount_plan",
		},
	),
	[HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_APPROVE]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_APPROVE,
		{
			domain: "workforce-planning",
			aggregateType: "headcount_plan",
			eventTypes: [HUMAN_RESOURCES_HEADCOUNT_PLAN_APPROVED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_REJECT]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_REJECT,
		{
			domain: "workforce-planning",
			aggregateType: "headcount_plan",
		},
	),
	[HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_SUPERSEDE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_SUPERSEDE,
		{
			domain: "workforce-planning",
			aggregateType: "headcount_plan",
		},
	),
	[HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_CLOSE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_CLOSE,
		{
			domain: "workforce-planning",
			aggregateType: "headcount_plan",
		},
	),
	[HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVE]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVE,
		{
			domain: "workforce-planning",
			aggregateType: "headcount_reservation",
			eventTypes: [HUMAN_RESOURCES_HEADCOUNT_RESERVED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVATION_RELEASE]:
		defineDomainEventEmission(
			HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVATION_RELEASE,
			{
				domain: "workforce-planning",
				aggregateType: "headcount_reservation",
				eventTypes: [
					HUMAN_RESOURCES_HEADCOUNT_RESERVATION_RELEASED_EVENT,
				] as const,
			},
		),
	[HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVATION_CONSUME]:
		defineDomainEventEmission(
			HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVATION_CONSUME,
			{
				domain: "workforce-planning",
				aggregateType: "headcount_reservation",
				eventTypes: [
					HUMAN_RESOURCES_HEADCOUNT_RESERVATION_CONSUMED_EVENT,
				] as const,
			},
		),
} satisfies Record<
	HumanResourcesWorkforcePlanningCommandId,
	HumanResourcesMutationEmissionDefinition
>;
