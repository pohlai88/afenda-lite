/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_ATTENDANCE_EVENT =
	"attendance-event" as const;
export type HumanResourcesAttendanceEventAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_ATTENDANCE_EVENT;
