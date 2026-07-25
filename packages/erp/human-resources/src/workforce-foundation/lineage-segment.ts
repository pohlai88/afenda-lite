import { fail, ok, type Result } from "@afenda/errors/result";

import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";

export function validateLineageSegmentEffectiveOn(input: {
	openEffectiveFrom: string;
	effectiveOn: string;
}): Result<void> {
	if (input.effectiveOn <= input.openEffectiveFrom) {
		return fail(
			"VALIDATION_ERROR",
			"Effective date must be after the open segment start date",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
		);
	}
	return ok(undefined);
}

export function assertLineageSegmentMutable(input: {
	lineageStatus: "active" | "superseded";
}): Result<void> {
	if (input.lineageStatus === "superseded") {
		return fail(
			"CONFLICT",
			"Closed lineage segments cannot be modified",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
		);
	}
	return ok(undefined);
}
