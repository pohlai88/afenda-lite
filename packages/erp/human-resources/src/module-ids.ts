export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_CREATE =
	"human-resources.employee.create" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_UPDATE =
	"human-resources.employee.update" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CREATE =
	"human-resources.employment.create" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_AMEND =
	"human-resources.employment.amend" as const;
export const HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CREATE =
	"human-resources.employment-contract.create" as const;
export const HUMAN_RESOURCES_COMMAND_DEPARTMENT_CREATE =
	"human-resources.department.create" as const;
export const HUMAN_RESOURCES_COMMAND_DEPARTMENT_UPDATE =
	"human-resources.department.update" as const;
export const HUMAN_RESOURCES_COMMAND_DEPARTMENT_ACTIVATE =
	"human-resources.department.activate" as const;
export const HUMAN_RESOURCES_COMMAND_DEPARTMENT_ARCHIVE =
	"human-resources.department.archive" as const;
export const HUMAN_RESOURCES_COMMAND_JOB_CREATE =
	"human-resources.job.create" as const;
export const HUMAN_RESOURCES_COMMAND_JOB_UPDATE =
	"human-resources.job.update" as const;
export const HUMAN_RESOURCES_COMMAND_JOB_ACTIVATE =
	"human-resources.job.activate" as const;
export const HUMAN_RESOURCES_COMMAND_JOB_ARCHIVE =
	"human-resources.job.archive" as const;
export const HUMAN_RESOURCES_COMMAND_POSITION_CREATE =
	"human-resources.position.create" as const;
export const HUMAN_RESOURCES_COMMAND_POSITION_UPDATE =
	"human-resources.position.update" as const;
export const HUMAN_RESOURCES_COMMAND_POSITION_ACTIVATE =
	"human-resources.position.activate" as const;
export const HUMAN_RESOURCES_COMMAND_POSITION_FREEZE =
	"human-resources.position.freeze" as const;
export const HUMAN_RESOURCES_COMMAND_POSITION_CLOSE =
	"human-resources.position.close" as const;
export const HUMAN_RESOURCES_COMMAND_ASSIGNMENT_CREATE =
	"human-resources.assignment.create" as const;
export const HUMAN_RESOURCES_COMMAND_ASSIGNMENT_END =
	"human-resources.assignment.end" as const;
export const HUMAN_RESOURCES_COMMAND_REPORTING_LINE_ASSIGN_PRIMARY =
	"human-resources.reporting-line.assign-primary" as const;
export const HUMAN_RESOURCES_COMMAND_REPORTING_LINE_CLOSE =
	"human-resources.reporting-line.close" as const;
export const HUMAN_RESOURCES_COMMAND_REPORTING_LINE_REPLACE_PRIMARY =
	"human-resources.reporting-line.replace-primary" as const;

export const HUMAN_RESOURCES_COMMAND_IDS = [
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_UPDATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_AMEND,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CREATE,
	HUMAN_RESOURCES_COMMAND_DEPARTMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_DEPARTMENT_UPDATE,
	HUMAN_RESOURCES_COMMAND_DEPARTMENT_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_DEPARTMENT_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_JOB_CREATE,
	HUMAN_RESOURCES_COMMAND_JOB_UPDATE,
	HUMAN_RESOURCES_COMMAND_JOB_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_JOB_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_POSITION_CREATE,
	HUMAN_RESOURCES_COMMAND_POSITION_UPDATE,
	HUMAN_RESOURCES_COMMAND_POSITION_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_POSITION_FREEZE,
	HUMAN_RESOURCES_COMMAND_POSITION_CLOSE,
	HUMAN_RESOURCES_COMMAND_ASSIGNMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_ASSIGNMENT_END,
	HUMAN_RESOURCES_COMMAND_REPORTING_LINE_ASSIGN_PRIMARY,
	HUMAN_RESOURCES_COMMAND_REPORTING_LINE_CLOSE,
	HUMAN_RESOURCES_COMMAND_REPORTING_LINE_REPLACE_PRIMARY,
] as const;

export type HumanResourcesCommandId =
	(typeof HUMAN_RESOURCES_COMMAND_IDS)[number];

export const HUMAN_RESOURCES_QUERY_EMPLOYEE_GET =
	"human-resources.employee.get" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYEE_LIST =
	"human-resources.employee.list" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYMENT_GET =
	"human-resources.employment.get" as const;
export const HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_GET =
	"human-resources.employment-contract.get" as const;
export const HUMAN_RESOURCES_QUERY_DEPARTMENT_GET =
	"human-resources.department.get" as const;
export const HUMAN_RESOURCES_QUERY_DEPARTMENT_LIST =
	"human-resources.department.list" as const;
export const HUMAN_RESOURCES_QUERY_JOB_GET = "human-resources.job.get" as const;
export const HUMAN_RESOURCES_QUERY_JOB_LIST =
	"human-resources.job.list" as const;
export const HUMAN_RESOURCES_QUERY_POSITION_GET =
	"human-resources.position.get" as const;
export const HUMAN_RESOURCES_QUERY_POSITION_LIST =
	"human-resources.position.list" as const;
export const HUMAN_RESOURCES_QUERY_ASSIGNMENT_GET =
	"human-resources.assignment.get" as const;
export const HUMAN_RESOURCES_QUERY_REPORTING_LINE_RESOLVE_PRIMARY_MANAGER =
	"human-resources.reporting-line.resolve-primary-manager" as const;
export const HUMAN_RESOURCES_QUERY_REPORTING_LINE_LIST_DIRECT_REPORTS =
	"human-resources.reporting-line.list-direct-reports" as const;
export const HUMAN_RESOURCES_QUERY_ORGANIZATION_TREE =
	"human-resources.organization.tree" as const;

export const HUMAN_RESOURCES_QUERY_IDS = [
	HUMAN_RESOURCES_QUERY_EMPLOYEE_GET,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_LIST,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_GET,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_GET,
	HUMAN_RESOURCES_QUERY_DEPARTMENT_GET,
	HUMAN_RESOURCES_QUERY_DEPARTMENT_LIST,
	HUMAN_RESOURCES_QUERY_JOB_GET,
	HUMAN_RESOURCES_QUERY_JOB_LIST,
	HUMAN_RESOURCES_QUERY_POSITION_GET,
	HUMAN_RESOURCES_QUERY_POSITION_LIST,
	HUMAN_RESOURCES_QUERY_ASSIGNMENT_GET,
	HUMAN_RESOURCES_QUERY_REPORTING_LINE_RESOLVE_PRIMARY_MANAGER,
	HUMAN_RESOURCES_QUERY_REPORTING_LINE_LIST_DIRECT_REPORTS,
	HUMAN_RESOURCES_QUERY_ORGANIZATION_TREE,
] as const;

export type HumanResourcesQueryId = (typeof HUMAN_RESOURCES_QUERY_IDS)[number];
