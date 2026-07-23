import { createProductionAttendanceSource } from "@afenda/human-resources";

/** Composition-root attendance source for Time import pulls. */
export function createHumanResourcesAttendanceSourcePort() {
	return createProductionAttendanceSource();
}
