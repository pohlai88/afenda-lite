import {
	HUMAN_RESOURCES_COMMAND_PRIOR_EMPLOYER_YTD_RECORD,
	HUMAN_RESOURCES_COMMAND_STATUTORY_PROFILE_UPSERT,
} from "../../operations/module-ids";
import { defineAuditOnlyEmission } from "../define-emission";
import type { HumanResourcesMutationEmissionDefinition } from "../types";

export type HumanResourcesStatutoryProfileCommandId =
	| typeof HUMAN_RESOURCES_COMMAND_PRIOR_EMPLOYER_YTD_RECORD
	| typeof HUMAN_RESOURCES_COMMAND_STATUTORY_PROFILE_UPSERT;

/**
 * D0 statutory-fact capture is audit-only: the facts leave HR through the
 * payroll handoff, never through a standalone domain event.
 */
export const HUMAN_RESOURCES_STATUTORY_PROFILE_EMISSIONS = {
	[HUMAN_RESOURCES_COMMAND_STATUTORY_PROFILE_UPSERT]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_STATUTORY_PROFILE_UPSERT,
		{
			domain: "compliance",
			aggregateType: "statutory_profile",
		},
	),
	[HUMAN_RESOURCES_COMMAND_PRIOR_EMPLOYER_YTD_RECORD]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_PRIOR_EMPLOYER_YTD_RECORD,
		{
			domain: "compliance",
			aggregateType: "prior_employer_ytd",
		},
	),
} satisfies Record<
	HumanResourcesStatutoryProfileCommandId,
	HumanResourcesMutationEmissionDefinition
>;
