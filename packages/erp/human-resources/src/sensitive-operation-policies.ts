import { HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS } from "./operation-registry/registry";
import type { HumanResourcesOperationId } from "./shared/authorization-types";
import type { HumanResourcesOperationSensitivity } from "./shared/sensitivity-types";

export type HumanResourcesSensitiveOperationId = HumanResourcesOperationId;
export type HumanResourcesSensitiveOperationPolicy =
	HumanResourcesOperationSensitivity;
export type { HumanResourcesSubjectPolicy } from "./shared/sensitivity-types";

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
