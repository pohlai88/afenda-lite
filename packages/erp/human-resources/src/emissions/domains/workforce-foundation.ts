import {
	HUMAN_RESOURCES_PERSON_CHANGED_EVENT,
	HUMAN_RESOURCES_PERSON_CONTACT_ADDED_EVENT,
	HUMAN_RESOURCES_PERSON_CONTACT_CHANGED_EVENT,
	HUMAN_RESOURCES_PERSON_CONTACT_RETIRED_EVENT,
	HUMAN_RESOURCES_PERSON_CREATED_EVENT,
	HUMAN_RESOURCES_PERSON_IDENTIFIER_ADDED_EVENT,
	HUMAN_RESOURCES_PERSON_IDENTIFIER_RETIRED_EVENT,
	HUMAN_RESOURCES_WORKER_CHANGED_EVENT,
	HUMAN_RESOURCES_WORKER_CREATED_EVENT,
} from "@afenda/events/schemas";

import {
	HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_ADD,
	HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_RETIRE,
	HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_UPDATE,
	HUMAN_RESOURCES_COMMAND_PERSON_CREATE,
	HUMAN_RESOURCES_COMMAND_PERSON_IDENTIFIER_ADD,
	HUMAN_RESOURCES_COMMAND_PERSON_IDENTIFIER_RETIRE,
	HUMAN_RESOURCES_COMMAND_PERSON_PREFERRED_NAME_UPDATE,
	HUMAN_RESOURCES_COMMAND_PERSON_PRIVACY_CLASSIFICATION_SET,
	HUMAN_RESOURCES_COMMAND_PERSON_UPDATE,
	HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_STATUS,
	HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_TYPE,
	HUMAN_RESOURCES_COMMAND_WORKER_CREATE,
	type HumanResourcesWorkforceFoundationCommandId,
} from "../../module-ids";

import {
	defineAuditOnlyEmission,
	defineDomainEventEmission,
} from "../define-emission";
import type { HumanResourcesMutationEmissionDefinition } from "../types";

export const HUMAN_RESOURCES_WORKFORCE_FOUNDATION_EMISSIONS = {
	[HUMAN_RESOURCES_COMMAND_PERSON_CREATE]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_PERSON_CREATE,
		{
			domain: "workforce-foundation",
			aggregateType: "person",
			eventTypes: [HUMAN_RESOURCES_PERSON_CREATED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_PERSON_UPDATE]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_PERSON_UPDATE,
		{
			domain: "workforce-foundation",
			aggregateType: "person",
			eventTypes: [HUMAN_RESOURCES_PERSON_CHANGED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_PERSON_PREFERRED_NAME_UPDATE]:
		defineDomainEventEmission(HUMAN_RESOURCES_COMMAND_PERSON_PREFERRED_NAME_UPDATE, {
			domain: "workforce-foundation",
			aggregateType: "person",
			eventTypes: [HUMAN_RESOURCES_PERSON_CHANGED_EVENT] as const,
		}),
	[HUMAN_RESOURCES_COMMAND_PERSON_PRIVACY_CLASSIFICATION_SET]:
		defineDomainEventEmission(
			HUMAN_RESOURCES_COMMAND_PERSON_PRIVACY_CLASSIFICATION_SET,
			{
				domain: "workforce-foundation",
				aggregateType: "person",
				eventTypes: [HUMAN_RESOURCES_PERSON_CHANGED_EVENT] as const,
			},
		),
	[HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_ADD]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_ADD,
		{
			domain: "workforce-foundation",
			aggregateType: "person_contact",
			eventTypes: [HUMAN_RESOURCES_PERSON_CONTACT_ADDED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_UPDATE]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_UPDATE,
		{
			domain: "workforce-foundation",
			aggregateType: "person_contact",
			eventTypes: [HUMAN_RESOURCES_PERSON_CONTACT_CHANGED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_RETIRE]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_PERSON_CONTACT_RETIRE,
		{
			domain: "workforce-foundation",
			aggregateType: "person_contact",
			eventTypes: [HUMAN_RESOURCES_PERSON_CONTACT_RETIRED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_PERSON_IDENTIFIER_ADD]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_PERSON_IDENTIFIER_ADD,
		{
			domain: "workforce-foundation",
			aggregateType: "person_identifier",
			eventTypes: [HUMAN_RESOURCES_PERSON_IDENTIFIER_ADDED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_PERSON_IDENTIFIER_RETIRE]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_PERSON_IDENTIFIER_RETIRE,
		{
			domain: "workforce-foundation",
			aggregateType: "person_identifier",
			eventTypes: [HUMAN_RESOURCES_PERSON_IDENTIFIER_RETIRED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_WORKER_CREATE]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_WORKER_CREATE,
		{
			domain: "workforce-foundation",
			aggregateType: "worker",
			eventTypes: [HUMAN_RESOURCES_WORKER_CREATED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_TYPE]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_TYPE,
		{
			domain: "workforce-foundation",
			aggregateType: "worker",
			eventTypes: [HUMAN_RESOURCES_WORKER_CHANGED_EVENT] as const,
		},
	),
	[HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_STATUS]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_WORKER_CHANGE_STATUS,
		{
			domain: "workforce-foundation",
			aggregateType: "worker",
			eventTypes: [HUMAN_RESOURCES_WORKER_CHANGED_EVENT] as const,
		},
	),
} satisfies Record<
	HumanResourcesWorkforceFoundationCommandId,
	HumanResourcesMutationEmissionDefinition
>;
