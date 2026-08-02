// Main exports for @afenda/human-resources package
import "server-only";

export * from "../features/bulk-export/index";
export * from "../features/bulk-import/index";
export * from "../features/bulk-jobs/index";
export * from "../features/compensation-benefits/benefit-dependent";
export * from "../features/compensation-benefits/benefit-eligibility";
export * from "../features/compensation-benefits/benefit-enrollment";
export * from "../features/compensation-benefits/benefit-plan";
export * from "../features/compensation-benefits/compensation-grade";
export * from "../features/compensation-benefits/compensation-grade-progression-rule";
export * from "../features/compensation-benefits/compensation-proposal";
export * from "../features/compensation-benefits/compensation-review";
export * from "../features/compensation-benefits/compensation-review-cycle";
export * from "../features/compensation-benefits/employee-compensation";
export * from "../features/compensation-benefits/salary-band";
export * from "../features/compliance/document-requirement";
export * from "../features/compliance/employee-compliance-summary";
export * from "../features/compliance/employee-document";
export * from "../features/compliance/expiry-operations";
export * from "../features/compliance/policy-acknowledgement";
export { createVaultDocumentReferenceAdapter } from "../features/compliance/vault-document-reference-adapter";
export * from "../features/compliance/work-eligibility";
export * from "../features/employee-relations/case-action";
export * from "../features/employee-relations/case-appeal";
export * from "../features/employee-relations/case-event";
export * from "../features/employee-relations/employee-case";
export type * from "../features/employee-relations/types";
export * from "../features/employment-lifecycle/confirmation";
export * from "../features/employment-lifecycle/offboarding";
export * from "../features/employment-lifecycle/onboarding";
export * from "../features/employment-lifecycle/onboarding-checklist";
export * from "../features/employment-lifecycle/onboarding-completion-readiness";
export * from "../features/employment-lifecycle/probation";
export * from "../features/employment-lifecycle/termination";
export * from "../features/employment-lifecycle/transfer";
export * from "../features/hire-to-employee/hire-from-accepted-offer";
export type * from "../features/hire-to-employee/types";
export * from "../features/learning/certification";
export * from "../features/learning/completion";
export * from "../features/learning/course";
export * from "../features/learning/learning-assignment";
export * from "../features/learning/learning-attendance";
export * from "../features/learning/learning-session";
export * from "../features/leave/entitlement";
export * from "../features/leave/leave-policy";
export * from "../features/leave/leave-request";
export * from "../features/organization/department";
export * from "../features/organization/job";
export * from "../features/organization/position";
export * from "../features/organization/reporting-line";
export * from "../features/payroll-handoff/approved-payroll-handoff";
export * from "../features/payroll-handoff/delivery/index";
export * from "../features/payroll-handoff/map-approved-payroll-handoff";
export * from "../features/performance/goal";
export * from "../features/performance/improvement-plan";
export * from "../features/performance/performance-cycle";
export * from "../features/performance/review";
export * from "../features/privacy/contract";
export * from "../features/privacy/deletion-decision";
export * from "../features/privacy/operations";
export * from "../features/privacy/processor-boundary";
export * from "../features/recruitment/application";
export * from "../features/recruitment/candidate";
export * from "../features/recruitment/interview";
export * from "../features/recruitment/interview-field-projection";
export * from "../features/recruitment/offer";
export * from "../features/recruitment/requisition";
export * from "../features/reporting/index";
// Store resolver removed - internal only
export * from "../features/talent/career-plan";
export * from "../features/talent/competency";
export * from "../features/talent/critical-role-readiness";
export * from "../features/talent/succession-plan";
export type {
	ProjectedCompetencyAssessment,
	ProjectedEmployeeCompetencyProfile,
	ProjectedSuccessionCandidate,
	ProjectedSuccessionCandidateListPage,
	ProjectedTalentCriticalRoleReadiness,
	ProjectedTalentCriticalRoleReadinessListPage,
	ProjectedTalentProfileAssessment,
	ProjectedTalentProfileAssessmentListPage,
	ProjectedTalentProfileMobility,
	ProjectedTalentProfileMobilityListPage,
} from "../features/talent/talent-field-projection";
export * from "../features/talent/talent-pool";
export * from "../features/talent/talent-profile";
export * from "../features/talent/talent-profile-mobility";
export * from "../features/time/attendance/dry-run";
export { createHttpAttendanceConnectorPull } from "../features/time/attendance/http-connector-pull";
export * from "../features/time/index";
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
} from "../features/time/work-calendar";
export * from "../features/workforce-planning/availability";
export * from "../features/workforce-planning/headcount-plan";
export * from "../features/workforce-planning/headcount-plan-line";
export * from "../features/workforce-planning/headcount-reservation";
export * from "../features/workforce-records/employment/assignment";
export * from "../features/workforce-records/employment/assignment-management";
// Command entry points
export * from "../features/workforce-records/employment/employee";
export * from "../features/workforce-records/employment/employment";
export * from "../features/workforce-records/employment/employment-contract";
export * from "../features/workforce-records/employment/employment-contract-management";
export * from "../features/workforce-records/employment/employment-management";
export * from "../features/workforce-records/employment/org-context";
export * from "../features/workforce-records/identity/classification";
export * from "../features/workforce-records/identity/employee-management";
export * from "../features/workforce-records/identity/employee-profile-field-projection";
export * from "../features/workforce-records/identity/person";
export * from "../features/workforce-records/identity/person-management";
export type * from "../features/workforce-records/identity/types";
export * from "../features/workforce-records/identity/worker";
export type * from "../features/workforce-records/identity-resolution/identity-resolver";
export * from "../kernel/authorization/authorization-policy-types";
export * from "../kernel/authorization/authorization-types";
export * from "../kernel/authorization/contextual-authorization";
export * from "../kernel/authorization/manifest-permission";
export * from "../kernel/authorization/permissions";
export * from "../kernel/authorization/registry";
export * from "../kernel/authorization/run-authorized-operation";
export * from "../kernel/authorization/sensitive-operation-policies";
// Types and brands
export type * from "../kernel/contracts";
export * from "../kernel/emissions/audit-integrity";
export * from "../kernel/execution/command-options";
export * from "../kernel/execution/domain-runner";
// Error codes and utilities
export * from "../kernel/execution/error-codes";
// Ports and options
export type * from "../kernel/execution/ports";
export * from "../kernel/identity/brands";
export * from "../kernel/observability/index";
export * from "../kernel/privacy/field-projection";
export * from "../kernel/privacy/sensitive-field-types";
export * from "../kernel/reliability/index";
export * from "../kernel/temporal/effective-truth-adoption";
export * from "../kernel/temporal/effective-truth-classification";
export * from "../kernel/validation/index";
export * from "../testing/performance/index";
export * from "../testing/recovery/index";
export * from "./integrations/accounting-provisioning-facts";
export * from "./integrations/platform-facts";
export { createProductionApprovedLeaveQuery } from "./production/approved-leave-query";
export { createProductionAssignmentContextQuery } from "./production/assignment-context-query";
export type {
	AttendanceConnectorPullPort,
	AttendanceSourcePreviewResult,
} from "./production/attendance-source";
export { createProductionAttendanceSource } from "./production/attendance-source";
export { createProductionWorkCalendar } from "./production/work-calendar";
export type * from "./store/index";
