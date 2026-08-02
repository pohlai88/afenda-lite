import type {
	HumanResourcesCommandId,
	HumanResourcesQueryId,
} from "./module-ids";
import type { HumanResourcesOperationDefinition } from "./types";

type HumanResourcesOperationId =
	| HumanResourcesCommandId
	| HumanResourcesQueryId;

export type HumanResourcesOperationTemporalPolicy =
	| "command-contract"
	| "current-state"
	| "effective-as-of"
	| "legal-work-date";

/**
 * Canonical exceptions to the package default temporal disposition.
 * Commands own dates in their validated command contract; ordinary queries read
 * current state. Operations below deliberately select historical effective truth
 * or a caller-supplied legal work date.
 */
export const HUMAN_RESOURCES_OPERATION_TEMPORAL_POLICY_OVERRIDES: Readonly<
	Partial<
		Record<HumanResourcesOperationId, HumanResourcesOperationTemporalPolicy>
	>
> = Object.freeze({
	"human-resources.person.get-as-of": "effective-as-of",
	"human-resources.worker.get-as-of": "effective-as-of",
	"human-resources.employee.org-context.resolve": "effective-as-of",
	"human-resources.employment.as-of": "effective-as-of",
	"human-resources.employment-contract.as-of": "effective-as-of",
	"human-resources.employment-contract.current": "current-state",
	"human-resources.assignment.as-of": "effective-as-of",
	"human-resources.salary-band.find-as-of": "effective-as-of",
	"human-resources.department.as-of": "effective-as-of",
	"human-resources.organization.tree-as-of": "effective-as-of",
	"human-resources.job.as-of": "effective-as-of",
	"human-resources.position.as-of": "effective-as-of",
	"human-resources.position.occupancy-as-of": "effective-as-of",
	"human-resources.employment-calendar.resolve": "effective-as-of",
	"human-resources.employee-work-calendar.resolve": "effective-as-of",
	"human-resources.shift-assignment.scheduled-for-date": "legal-work-date",
});

const temporalPolicyOverridesById = new Map<
	string,
	HumanResourcesOperationTemporalPolicy
>(Object.entries(HUMAN_RESOURCES_OPERATION_TEMPORAL_POLICY_OVERRIDES));

export function projectHumanResourcesOperationTemporalPolicy(
	definition: Pick<HumanResourcesOperationDefinition, "id" | "kind">,
): HumanResourcesOperationTemporalPolicy {
	return (
		temporalPolicyOverridesById.get(definition.id) ??
		(definition.kind === "command" ? "command-contract" : "current-state")
	);
}
