// Main exports for @afenda/human-resources package
import "server-only";

export * from "./authorization";
export * from "./brands";
export * from "./command-options";
export * from "./compensation-benefits/benefit-enrollment";
export * from "./compensation-benefits/benefit-plan";
export * from "./compensation-benefits/compensation-grade";
export * from "./compensation-benefits/compensation-review";
export * from "./compensation-benefits/employee-compensation";
export * from "./compensation-benefits/salary-band";
export * from "./compliance/document-requirement";
export * from "./compliance/employee-compliance-summary";
export * from "./compliance/employee-document";
export * from "./compliance/policy-acknowledgement";
export * from "./compliance/work-eligibility";
export * from "./core/assignment";
// Command entry points
export * from "./core/employee";
export * from "./core/employment";
export * from "./core/employment-contract";
export * from "./currency-lookup";
export * from "./employee-relations/case-action";
export * from "./employee-relations/case-appeal";
export * from "./employee-relations/case-event";
export * from "./employee-relations/employee-case";
// Error codes and utilities
export * from "./error-codes";
export type * from "./identity-resolver";
export * from "./learning/certification";
export * from "./learning/completion";
export * from "./learning/course";
export * from "./learning/learning-assignment";
export * from "./learning/learning-session";
export * from "./leave/entitlement";
export * from "./leave/leave-policy";
export * from "./leave/leave-request";
export * from "./lifecycle/confirmation";
export * from "./lifecycle/offboarding";
export * from "./lifecycle/onboarding";
export * from "./lifecycle/probation";
export * from "./lifecycle/termination";
export * from "./lifecycle/transfer";
export * from "./organization/department";
export * from "./organization/job";
export * from "./organization/position";
export * from "./organization/reporting-line";
export * from "./performance/goal";
export * from "./performance/improvement-plan";
export * from "./performance/performance-cycle";
export * from "./performance/review";
// Ports and options
export type * from "./ports";
export { createProductionApprovedLeaveQuery } from "./production-approved-leave-query";
export { createProductionAssignmentContextQuery } from "./production-assignment-context-query";
export { createProductionAttendanceSource } from "./production-attendance-source";
export { createProductionWorkCalendar } from "./production-work-calendar";
export * from "./recruitment/application";
export * from "./recruitment/candidate";
export * from "./recruitment/interview";
export * from "./recruitment/offer";
export * from "./recruitment/requisition";
// Store resolver removed - internal only
export * from "./talent/career-plan";
export * from "./talent/competency";
export * from "./talent/succession-plan";
export * from "./talent/talent-pool";
export * from "./talent/talent-profile";
export * from "./time";
// Types and brands
export type * from "./types";
export { createVaultDocumentReferenceAdapter } from "./vault-document-reference-adapter";
export type {
	ResolvedWorkCalendarContext,
	WorkCalendarDayResolution,
	WorkCalendarHoliday,
	WorkCalendarLookupPort,
	WorkCalendarPort,
	WorkCalendarSegment,
	WorkCalendarSegmentInput,
	WorkCalendarShiftWindow,
	WorkWeekDayPattern,
} from "./work-calendar";
export * from "./workforce-planning/availability";
export * from "./workforce-planning/headcount-plan";
export * from "./workforce-planning/headcount-plan-line";
export * from "./workforce-planning/headcount-reservation";
