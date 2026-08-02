import { errorResult, type Result } from "@afenda/errors";

import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../../../kernel/execution/error-codes";

export function validateLineageSegmentEffectiveOn(input: {
	openEffectiveFrom: string;
	effectiveOn: string;
}): Result<void> {
	if (input.effectiveOn <= input.openEffectiveFrom) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			),
		});
	}
	return errorResult.ok(undefined);
}

export function assertLineageSegmentMutable(input: {
	lineageStatus: "active" | "superseded";
}): Result<void> {
	if (input.lineageStatus === "superseded") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "The request conflicts with current state",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			),
		});
	}
	return errorResult.ok(undefined);
}
