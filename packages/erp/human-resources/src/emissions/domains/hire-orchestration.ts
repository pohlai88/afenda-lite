import { HUMAN_RESOURCES_HIRE_FROM_ACCEPTED_OFFER_COMPLETED_EVENT } from "@afenda/events/schemas";

import {
	HUMAN_RESOURCES_COMMAND_HIRE_FROM_ACCEPTED_OFFER,
	type HumanResourcesHireOrchestrationCommandId,
} from "../../module-ids";

import {
	defineDomainEventEmission,
} from "../define-emission";
import type { HumanResourcesMutationEmissionDefinition } from "../types";

export const HUMAN_RESOURCES_HIRE_ORCHESTRATION_EMISSIONS = {
	[HUMAN_RESOURCES_COMMAND_HIRE_FROM_ACCEPTED_OFFER]: defineDomainEventEmission(
		HUMAN_RESOURCES_COMMAND_HIRE_FROM_ACCEPTED_OFFER,
		{
			domain: "recruitment",
			aggregateType: "hire_attempt",
			eventTypes: [HUMAN_RESOURCES_HIRE_FROM_ACCEPTED_OFFER_COMPLETED_EVENT] as const,
		},
	),
} satisfies Record<
	HumanResourcesHireOrchestrationCommandId,
	HumanResourcesMutationEmissionDefinition
>;
