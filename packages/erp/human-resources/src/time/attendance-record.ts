/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_ATTENDANCE_RECORD =
	"attendance-record" as const;
export type HumanResourcesAttendanceRecordAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_ATTENDANCE_RECORD;
