import { HUMAN_RESOURCES_LEARNING_ASSIGNMENT_CREATED_EVENT } from "@afenda/events/schemas";

import {
	HUMAN_RESOURCES_COMMAND_COURSE_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_COURSE_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_COURSE_CREATE,
	HUMAN_RESOURCES_COMMAND_COURSE_UPDATE,
	HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_ENROL,
	HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_WAIVE,
	HUMAN_RESOURCES_COMMAND_SESSION_CANCEL,
	HUMAN_RESOURCES_COMMAND_SESSION_COMPLETE,
	HUMAN_RESOURCES_COMMAND_SESSION_CREATE,
	HUMAN_RESOURCES_COMMAND_SESSION_START,
	type HumanResourcesLearningCommandId,
} from "../../module-ids";

import {
	defineAuditOnlyEmission,
	defineDomainEventEmission,
} from "../define-emission";
import type { HumanResourcesMutationEmissionDefinition } from "../types";

export const HUMAN_RESOURCES_LEARNING_EMISSIONS = {
	[HUMAN_RESOURCES_COMMAND_COURSE_CREATE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_COURSE_CREATE,
		{
			domain: "learning",
			aggregateType: "course",
		},
	),
	[HUMAN_RESOURCES_COMMAND_COURSE_UPDATE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_COURSE_UPDATE,
		{
			domain: "learning",
			aggregateType: "course",
		},
	),
	[HUMAN_RESOURCES_COMMAND_COURSE_ACTIVATE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_COURSE_ACTIVATE,
		{
			domain: "learning",
			aggregateType: "course",
		},
	),
	[HUMAN_RESOURCES_COMMAND_COURSE_ARCHIVE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_COURSE_ARCHIVE,
		{
			domain: "learning",
			aggregateType: "course",
		},
	),
	[HUMAN_RESOURCES_COMMAND_SESSION_CREATE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_SESSION_CREATE,
		{
			domain: "learning",
			aggregateType: "learning_session",
		},
	),
	[HUMAN_RESOURCES_COMMAND_SESSION_START]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_SESSION_START,
		{
			domain: "learning",
			aggregateType: "learning_session",
		},
	),
	[HUMAN_RESOURCES_COMMAND_SESSION_COMPLETE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_SESSION_COMPLETE,
		{
			domain: "learning",
			aggregateType: "learning_session",
		},
	),
	[HUMAN_RESOURCES_COMMAND_SESSION_CANCEL]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_SESSION_CANCEL,
		{
			domain: "learning",
			aggregateType: "learning_session",
		},
	),
	[HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_CREATE]:
		defineDomainEventEmission(
			HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_CREATE,
			{
				domain: "learning",
				aggregateType: "learning_assignment",
				eventTypes: [HUMAN_RESOURCES_LEARNING_ASSIGNMENT_CREATED_EVENT] as const,
			},
		),
	[HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_ENROL]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_ENROL,
		{
			domain: "learning",
			aggregateType: "learning_assignment",
		},
	),
	[HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_WAIVE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_WAIVE,
		{
			domain: "learning",
			aggregateType: "learning_assignment",
		},
	),
} satisfies Record<
	HumanResourcesLearningCommandId,
	HumanResourcesMutationEmissionDefinition
>;
