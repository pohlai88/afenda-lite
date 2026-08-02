import type { HumanResourcesStore } from "../store";

export const HUMAN_RESOURCES_PRIVACY_EXPORT_STORE_METHODS = [
	"findOpenAssignmentByEmployment",
	"findOpenEmploymentByEmployee",
	"findWorkerByEmployeeId",
	"getEmployeeById",
	"getEmployeeRelationsHistoryByEmployee",
	"getPersonById",
	"getTalentProfileByEmployee",
	"listBenefitEnrollmentsByEmployee",
	"listCertifications",
	"listCompensationReviewsByEmployee",
	"listCompletions",
	"listEmployeeCareerPlans",
	"listEmployeeCompensationsByEmployee",
	"listEmployeeDocuments",
	"listEmployeeGoals",
	"listEmployeePerformanceReviews",
	"listLearningAssignments",
	"listLearningAttendance",
	"listLeaveEntitlements",
	"listLeaveRequests",
	"listOvertimeRequests",
	"listPersonContacts",
	"listPersonIdentifiers",
	"listPersonIdentityVersions",
	"listReportingLinesForEmployee",
	"listTimesheets",
] as const satisfies readonly (keyof HumanResourcesStore)[];

export type HumanResourcesPrivacyExportStore = Pick<
	HumanResourcesStore,
	(typeof HUMAN_RESOURCES_PRIVACY_EXPORT_STORE_METHODS)[number]
>;

export function projectHumanResourcesPrivacyExportStore(
	store: HumanResourcesStore,
): HumanResourcesPrivacyExportStore {
	return store;
}
