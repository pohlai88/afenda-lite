import { HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS } from "../operations/registry";
import type { HumanResourcesOperationSensitivity } from "../privacy/sensitivity-types";
import type { HumanResourcesOperationId } from "./authorization-types";

export type HumanResourcesSensitiveOperationId = HumanResourcesOperationId;
export type HumanResourcesSensitiveOperationPolicy =
	HumanResourcesOperationSensitivity;
export type { HumanResourcesSubjectPolicy } from "../privacy/sensitivity-types";

const SENSITIVE_OPERATION_DEFINITIONS =
	HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS.filter(
		(definition) => definition.sensitivity !== null,
	);

/** Exact operation-ID projection derived from the canonical operation registry. */
export const HUMAN_RESOURCES_SENSITIVE_OPERATION_IDS = Object.freeze(
	SENSITIVE_OPERATION_DEFINITIONS.map((definition) => definition.id),
);

export function humanResourcesSensitiveOperationPolicy(
	operation: HumanResourcesSensitiveOperationId,
): HumanResourcesSensitiveOperationPolicy | null {
	return (
		SENSITIVE_OPERATION_DEFINITIONS.find(
			(definition) => definition.id === operation,
		)?.sensitivity ?? null
	);
}
