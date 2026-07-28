// Main exports for @afenda/human-resources package
import "server-only";

export * from "./audit-integrity";
export * from "./brands";
export * from "./bulk";
export * from "./bulk-export";
export * from "./bulk-jobs";
export * from "./command-options";
export * from "./compensation-benefits/benefit-dependent";
export * from "./compensation-benefits/benefit-eligibility";
export * from "./compensation-benefits/benefit-enrollment";
export * from "./compensation-benefits/benefit-plan";
export * from "./compensation-benefits/compensation-grade";
export * from "./compensation-benefits/compensation-grade-progression-rule";
export * from "./compensation-benefits/compensation-proposal";
export * from "./compensation-benefits/compensation-review";
export * from "./compensation-benefits/compensation-review-cycle";
export * from "./compensation-benefits/currency-lookup";
export * from "./compensation-benefits/employee-compensation";
export * from "./compensation-benefits/salary-band";
export * from "./compliance/document-requirement";
export * from "./compliance/employee-compliance-summary";
export * from "./compliance/employee-document";
export * from "./compliance/expiry-operations";
export * from "./compliance/policy-acknowledgement";
export { createVaultDocumentReferenceAdapter } from "./compliance/vault-document-reference-adapter";
export * from "./compliance/work-eligibility";
export * from "./core/assignment";
export * from "./core/assignment-management";
// Command entry points
export * from "./core/employee";
export * from "./core/employment";
export * from "./core/employment-contract";
export * from "./core/employment-contract-management";
export * from "./core/employment-management";
export * from "./core/org-context";
export * from "./effective-truth-adoption";
export * from "./effective-truth-classification";
export * from "./employee-relations/case-action";
export * from "./employee-relations/case-appeal";
export * from "./employee-relations/case-event";
export * from "./employee-relations/employee-case";
export type * from "./employee-relations/types";
// Error codes and utilities
export * from "./error-codes";
export * from "./handoff/approved-payroll-handoff";
export * from "./handoff/map-approved-payroll-handoff";
export type * from "./handoff/ports";
export * from "./hire-orchestration/hire-from-accepted-offer";
export type * from "./hire-orchestration/types";
export type * from "./identity-resolver";
export * from "./integrations/accounting-provisioning-facts";
export * from "./integrations/payroll-delivery";
export * from "./integrations/platform-facts";
export * from "./learning/certification";
export * from "./learning/completion";
export * from "./learning/course";
export * from "./learning/learning-assignment";
export * from "./learning/learning-attendance";
export * from "./learning/learning-session";
export * from "./leave/entitlement";
export * from "./leave/leave-policy";
export * from "./leave/leave-request";
export * from "./lifecycle/confirmation";
export * from "./lifecycle/offboarding";
export * from "./lifecycle/onboarding";
export * from "./lifecycle/onboarding-checklist";
export * from "./lifecycle/probation";
export * from "./lifecycle/termination";
export * from "./lifecycle/transfer";
export * from "./observability";
export * from "./organization/department";
export * from "./organization/job";
export * from "./organization/position";
export * from "./organization/reporting-line";
export * from "./performance/goal";
export * from "./performance/improvement-plan";
export * from "./performance/performance-cycle";
export * from "./performance/review";
export * from "./performance-verification";
export * from "./permissions";
// Ports and options
export type * from "./ports";
export * from "./privacy";
export * from "./privacy/deletion-decision";
export * from "./privacy/operations";
export * from "./privacy/processor-boundary";
export { createProductionApprovedLeaveQuery } from "./production-approved-leave-query";
export { createProductionAssignmentContextQuery } from "./production-assignment-context-query";
export type {
	AttendanceConnectorPullPort,
	AttendanceSourcePreviewResult,
} from "./production-attendance-source";
export { createProductionAttendanceSource } from "./production-attendance-source";
export { createProductionWorkCalendar } from "./production-work-calendar";
export * from "./recovery-verification";
export * from "./recruitment/application";
export * from "./recruitment/candidate";
export * from "./recruitment/interview";
export * from "./recruitment/interview-field-projection";
export * from "./recruitment/offer";
export * from "./recruitment/requisition";
export * from "./reliability";
export * from "./reporting";
export * from "./schemas";
export * from "./sensitive-operation-policies";
export * from "./shared/authorization-policy-registry";
export * from "./shared/authorization-policy-types";
export * from "./shared/authorization-types";
export * from "./shared/contextual-authorization";
export * from "./shared/domain-runner";
export * from "./shared/field-projection";
export * from "./shared/manifest-permission";
export * from "./shared/onboarding-completion-readiness";
export * from "./shared/run-authorized-operation";
export * from "./shared/sensitive-field-types";
export type * from "./store";
// Store resolver removed - internal only
export * from "./talent/career-plan";
export * from "./talent/competency";
export * from "./talent/critical-role-readiness";
export * from "./talent/succession-plan";
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
} from "./talent/talent-field-projection";
export * from "./talent/talent-pool";
export * from "./talent/talent-profile";
export * from "./talent/talent-profile-mobility";
export * from "./time";
export * from "./time/attendance/dry-run";
export { createHttpAttendanceConnectorPull } from "./time/attendance/http-connector-pull";
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
} from "./time/work-calendar";
// Types and brands
export type * from "./types";
export * from "./workforce-foundation/classification";
export * from "./workforce-foundation/employee-management";
export * from "./workforce-foundation/employee-profile-field-projection";
export * from "./workforce-foundation/person";
export * from "./workforce-foundation/person-management";
export type * from "./workforce-foundation/types";
export * from "./workforce-foundation/worker";
export * from "./workforce-planning/availability";
export * from "./workforce-planning/headcount-plan";
export * from "./workforce-planning/headcount-plan-line";
export * from "./workforce-planning/headcount-reservation";
