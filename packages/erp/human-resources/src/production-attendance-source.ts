import { fail, type Result } from "@afenda/errors/result";

import {
	HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE,
	humanResourcesErrorDetails,
} from "./error-codes";
import type {
	AttendanceSourceBatch,
	AttendanceSourcePort,
} from "./time/handoff/ports";

/**
 * Composition-root attendance source for external import pulls.
 * Inline import events bypass this port; connector integrations replace this factory.
 */
export function createProductionAttendanceSource(): AttendanceSourcePort {
	return {
		async fetchEvents(): Promise<Result<AttendanceSourceBatch>> {
			return fail(
				"CONFLICT",
				"Pass inline import events or configure an attendance connector.",
				humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_DEPENDENCY_UNAVAILABLE,
				),
			);
		},
	};
}
