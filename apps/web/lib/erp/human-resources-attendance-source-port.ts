import { env } from "@afenda/env";
import type { AttendanceSourcePort } from "@afenda/human-resources";
import {
	createHttpAttendanceConnectorPull,
	createProductionAttendanceSource,
} from "@afenda/human-resources";

/** Composition-root attendance source for Time import pulls. */
export function createHumanResourcesAttendanceSourcePort(): AttendanceSourcePort {
	const baseUrl = env.HR_ATTENDANCE_CONNECTOR_BASE_URL;
	if (baseUrl === undefined) {
		return createProductionAttendanceSource();
	}

	return createProductionAttendanceSource({
		pull: createHttpAttendanceConnectorPull({ baseUrl }),
	});
}
