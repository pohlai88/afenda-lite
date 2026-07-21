/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_TIMESHEET = "timesheet" as const;
export type HumanResourcesTimesheetAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_TIMESHEET;
