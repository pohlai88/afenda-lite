export const HUMAN_RESOURCES_RESOURCE_KINDS = [
	"person",
	"worker",
	"employee",
	"employment",
	"assignment",
	"candidate",
	"interview",
	"offer",
	"leave_request",
	"timesheet",
	"overtime_request",
	"compensation",
	"performance_review",
	"employee_case",
	"employee_document",
	"work_eligibility",
	"competency_assessment",
	"talent_profile",
	"succession_plan",
	"headcount_plan",
	"privacy_subject",
] as const;

export type HumanResourcesResourceKind =
	(typeof HUMAN_RESOURCES_RESOURCE_KINDS)[number];
