/** Aggregate boundary marker — commands ship in a later slice. */
export const PAYROLL_AGGREGATE_CALENDAR = "calendar" as const;
export type PayrollCalendarAggregate = typeof PAYROLL_AGGREGATE_CALENDAR;
