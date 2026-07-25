import { createScopedPolicy } from "./create-scoped-policy";

export const timePolicy = createScopedPolicy({
	id: "hr.time",
	mode: "resource_scoped",
	resourceRequired: true,
	subjectPolicy: "subject_or_privileged",
	operationPrefixes: [
		"human-resources.employment-calendar.",
		"human-resources.employee-work-calendar.",
		"human-resources.time-policy.",
		"human-resources.time-approval-authority.",
		"human-resources.shift.",
		"human-resources.shift-assignment.",
		"human-resources.attendance-event.",
		"human-resources.attendance-events.",
		"human-resources.attendance-session.",
		"human-resources.attendance-break-waiver.",
		"human-resources.attendance-break-waiver-decision.",
		"human-resources.attendance-exception.",
		"human-resources.attendance-adjustment.",
		"human-resources.attendance.",
		"human-resources.timesheet.",
		"human-resources.timesheet-approval-decision.",
		"human-resources.approved-time-handoff.",
		"human-resources.overtime-request.",
	],
});
