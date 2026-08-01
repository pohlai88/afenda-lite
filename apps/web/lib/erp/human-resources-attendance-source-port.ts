import { env } from "@afenda/env";
import type { AttendanceSourceCapability } from "@afenda/human-resources";
import {
	createHttpAttendanceConnectorPull,
	createProductionAttendanceSource,
	type HrObservabilityCapabilities,
} from "@afenda/human-resources";

/** Composition-root attendance source for Time import pulls. */
export function createHumanResourcesAttendanceSourcePort(
	observability: HrObservabilityCapabilities,
): AttendanceSourceCapability {
	const baseUrl = env.HR_ATTENDANCE_CONNECTOR_BASE_URL;
	if (baseUrl === undefined) {
		return createProductionAttendanceSource();
	}

	return createProductionAttendanceSource({
		pull: createHttpAttendanceConnectorPull({ baseUrl }),
		observability,
	});
}
