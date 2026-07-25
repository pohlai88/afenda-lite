import {
	HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_PLACE,
	HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_RELEASE,
	HUMAN_RESOURCES_COMMAND_PRIVACY_SUBJECT_ANONYMIZE,
} from "../../module-ids";

import { defineAuditOnlyEmission } from "../define-emission";
import type { HumanResourcesMutationEmissionDefinition } from "../types";

export type HumanResourcesPrivacyCommandId =
	| typeof HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_PLACE
	| typeof HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_RELEASE
	| typeof HUMAN_RESOURCES_COMMAND_PRIVACY_SUBJECT_ANONYMIZE;

export const HUMAN_RESOURCES_PRIVACY_EMISSIONS = {
	[HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_PLACE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_PLACE,
		{
			domain: "privacy",
			aggregateType: "privacy_legal_hold",
		},
	),
	[HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_RELEASE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_PRIVACY_LEGAL_HOLD_RELEASE,
		{
			domain: "privacy",
			aggregateType: "privacy_legal_hold",
		},
	),
	[HUMAN_RESOURCES_COMMAND_PRIVACY_SUBJECT_ANONYMIZE]: defineAuditOnlyEmission(
		HUMAN_RESOURCES_COMMAND_PRIVACY_SUBJECT_ANONYMIZE,
		{
			domain: "privacy",
			aggregateType: "privacy_subject",
		},
	),
} satisfies Record<
	HumanResourcesPrivacyCommandId,
	HumanResourcesMutationEmissionDefinition
>;
