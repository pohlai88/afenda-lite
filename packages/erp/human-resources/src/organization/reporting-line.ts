/** Aggregate boundary marker — commands ship in a later slice. */
export const HUMAN_RESOURCES_AGGREGATE_REPORTING_LINE =
	"reporting-line" as const;
export type HumanResourcesReportingLineAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_REPORTING_LINE;
