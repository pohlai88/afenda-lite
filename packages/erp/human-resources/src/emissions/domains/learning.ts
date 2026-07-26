import {
	HUMAN_RESOURCES_CERTIFICATION_EXPIRING_EVENT,
	HUMAN_RESOURCES_CERTIFICATION_RENEWED_EVENT,
	HUMAN_RESOURCES_LEARNING_ASSIGNMENT_CREATED_EVENT,
	HUMAN_RESOURCES_LEARNING_COMPLETION_RECORDED_EVENT,
} from "@afenda/events/schemas";

import {
	HUMAN_RESOURCES_COMMAND_CERTIFICATION_EXPIRE,
	HUMAN_RESOURCES_COMMAND_CERTIFICATION_ISSUE,
	HUMAN_RESOURCES_COMMAND_CERTIFICATION_RENEW,
	HUMAN_RESOURCES_COMMAND_CERTIFICATION_REVOKE,
	HUMAN_RESOURCES_COMMAND_COMPLETION_RECORD,
	HUMAN_RESOURCES_COMMAND_COURSE_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_COURSE_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_COURSE_CREATE,
	HUMAN_RESOURCES_COMMAND_COURSE_UPDATE,
	HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_ENROL,
	HUMAN_RESOURCES_COMMAND_LEARNING_ASSIGNMENT_WAIVE,
	HUMAN_RESOURCES_COMMAND_LEARNING_ATTENDANCE_RECORD,
	HUMAN_RESOURCES_COMMAND_SESSION_ASSIGN_INSTRUCTOR,
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
	[HUMAN_RESOURCES_COMMAND_SESSION_ASSIGN_INSTRUCTOR]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_SESSION_ASSIGN_INSTRUCTOR,
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
				eventTypes: [
					HUMAN_RESOURCES_LEARNING_ASSIGNMENT_CREATED_EVENT,
				] as const,
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
	[HUMAN_RESOURCES_COMMAND_LEARNING_ATTENDANCE_RECORD]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_LEARNING_ATTENDANCE_RECORD,
		{
			domain: "learning",
			aggregateType: "learning_attendance",
		},
	),
	[HUMAN_RESOURCES_COMMAND_CERTIFICATION_ISSUE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_CERTIFICATION_ISSUE,
		{ domain: "learning", aggregateType: "certification" },
	),
	[HUMAN_RESOURCES_COMMAND_CERTIFICATION_EXPIRE]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_CERTIFICATION_EXPIRE,
		{
			domain: "learning",
			aggregateType: "certification",
			eventTypes: [HUMAN_RESOURCES_CERTIFICATION_EXPIRING_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_CERTIFICATION_REVOKE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_CERTIFICATION_REVOKE,
		{ domain: "learning", aggregateType: "certification" },
	),
	[HUMAN_RESOURCES_COMMAND_CERTIFICATION_RENEW]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_CERTIFICATION_RENEW,
		{
			domain: "learning",
			aggregateType: "certification",
			eventTypes: [HUMAN_RESOURCES_CERTIFICATION_RENEWED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_COMPLETION_RECORD]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_COMPLETION_RECORD,
		{
			domain: "learning",
			aggregateType: "learning_completion",
			eventTypes: [HUMAN_RESOURCES_LEARNING_COMPLETION_RECORDED_EVENT] as const,
		},
	),
} satisfies Record<
	HumanResourcesLearningCommandId,
	HumanResourcesMutationEmissionDefinition
>;
