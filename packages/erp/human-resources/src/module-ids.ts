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
export const HUMAN_RESOURCES_COMMAND_POSITION_CREATE =
	"human-resources.position.create" as const;
export const HUMAN_RESOURCES_COMMAND_ASSIGNMENT_CREATE =
	"human-resources.assignment.create" as const;
export const HUMAN_RESOURCES_COMMAND_ASSIGNMENT_END =
	"human-resources.assignment.end" as const;

export const HUMAN_RESOURCES_COMMAND_IDS = [
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_UPDATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_AMEND,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CONTRACT_CREATE,
	HUMAN_RESOURCES_COMMAND_POSITION_CREATE,
	HUMAN_RESOURCES_COMMAND_ASSIGNMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_ASSIGNMENT_END,
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
export const HUMAN_RESOURCES_QUERY_POSITION_GET =
	"human-resources.position.get" as const;
export const HUMAN_RESOURCES_QUERY_POSITION_LIST =
	"human-resources.position.list" as const;
export const HUMAN_RESOURCES_QUERY_ASSIGNMENT_GET =
	"human-resources.assignment.get" as const;

export const HUMAN_RESOURCES_QUERY_IDS = [
	HUMAN_RESOURCES_QUERY_EMPLOYEE_GET,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_LIST,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_GET,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_CONTRACT_GET,
	HUMAN_RESOURCES_QUERY_POSITION_GET,
	HUMAN_RESOURCES_QUERY_POSITION_LIST,
	HUMAN_RESOURCES_QUERY_ASSIGNMENT_GET,
] as const;

export type HumanResourcesQueryId = (typeof HUMAN_RESOURCES_QUERY_IDS)[number];
