import { ok, type Result } from "@afenda/errors/result";

import { lifecycleEffectiveDateIncoherent } from "./lifecycle-errors";
import type { LifecycleTransitionContext } from "./types";

export type EffectiveDateRange = Readonly<{
	effectiveFrom: Date | null;
	effectiveTo: Date | null;
}>;

export type EffectiveDatedAvailability = Readonly<{
	storedStatus: string;
	storedActive: boolean;
	effectiveFromSatisfied: boolean;
	effectiveToSatisfied: boolean;
	effectiveAvailable: boolean;
}>;

export function evaluateEffectiveDatedAvailability(
	input: EffectiveDateRange & Readonly<{ status: string; asOf: Date }>,
): EffectiveDatedAvailability {
	const storedActive = input.status === "active";
	const effectiveFromSatisfied =
		input.effectiveFrom !== null && input.effectiveFrom <= input.asOf;
	const effectiveToSatisfied =
		input.effectiveTo === null || input.effectiveTo > input.asOf;
	return {
		storedStatus: input.status,
		storedActive,
		effectiveFromSatisfied,
		effectiveToSatisfied,
		effectiveAvailable:
			storedActive && effectiveFromSatisfied && effectiveToSatisfied,
	};
}

export function assertEffectiveDatedLifecycleCoherence(
	input: EffectiveDateRange & Readonly<{ status: string; asOf: Date }>,
	context: LifecycleTransitionContext,
): Result<true> {
	const availability = evaluateEffectiveDatedAvailability(input);
	if (input.status !== "active" || availability.effectiveAvailable) {
		return ok(true);
	}
	return lifecycleEffectiveDateIncoherent({
		...context,
		currentState: input.status,
		effectiveFrom: input.effectiveFrom,
		effectiveTo: input.effectiveTo,
		asOf: input.asOf,
	});
}
