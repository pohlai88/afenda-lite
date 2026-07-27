import {
	HISTORICALLY_RESOLVABLE_LIFECYCLE_STATES,
	type LifecycleAvailabilityDecision,
	type LifecycleAvailabilityReason,
	OPERATIONALLY_SELECTABLE_LIFECYCLE_STATES,
} from "./types";

const HISTORICALLY_RESOLVABLE_STATE_SET = new Set<string>(
	HISTORICALLY_RESOLVABLE_LIFECYCLE_STATES,
);

export type LifecycleAvailabilityInput = Readonly<{
	exists?: boolean;
	state: string | null | undefined;
	mergedIntoId?: string | null;
	operationallySelectableStates?: readonly string[];
}>;

function addReason(
	reasons: readonly LifecycleAvailabilityReason[],
	reason: LifecycleAvailabilityReason,
): readonly LifecycleAvailabilityReason[] {
	return reasons.includes(reason) ? reasons : [...reasons, reason];
}

function inactiveReason(
	state: string | null | undefined,
): LifecycleAvailabilityReason {
	if (state === "blocked") return "blocked";
	if (state === "retired") return "retired";
	if (state === "archived") return "archived";
	if (state === "merged") return "merged";
	return "not_active";
}

export function evaluateLifecycleAvailability(
	input: LifecycleAvailabilityInput,
): LifecycleAvailabilityDecision {
	const exists =
		input.exists ?? (input.state !== null && input.state !== undefined);
	if (!exists) {
		return {
			exists: false,
			historicallyResolvable: false,
			active: false,
			operationallySelectable: false,
			canonical: false,
			reasons: ["not_found"],
		};
	}

	const state = input.state;
	const active = state === "active";
	const merged =
		input.mergedIntoId !== null && input.mergedIntoId !== undefined;
	const canonical = !merged && state !== "merged";
	const selectableStates =
		input.operationallySelectableStates ??
		OPERATIONALLY_SELECTABLE_LIFECYCLE_STATES;
	const operationallySelectable =
		active &&
		canonical &&
		state !== undefined &&
		selectableStates.includes(state);
	const historicallyResolvable =
		state !== null &&
		state !== undefined &&
		HISTORICALLY_RESOLVABLE_STATE_SET.has(state);

	let reasons: readonly LifecycleAvailabilityReason[] = [];
	if (!active) {
		reasons = addReason(reasons, inactiveReason(state));
	}
	if (merged) {
		reasons = addReason(reasons, "merged");
		reasons = addReason(reasons, "not_canonical");
	}

	return {
		exists: true,
		historicallyResolvable,
		active,
		operationallySelectable,
		canonical,
		reasons,
	};
}
