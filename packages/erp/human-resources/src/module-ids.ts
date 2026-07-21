export const HUMAN_RESOURCES_COMMAND_EMPLOYEE_CREATE =
	"human-resources.employee.create" as const;

export const HUMAN_RESOURCES_COMMAND_IDS = [
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CREATE,
] as const;

export type HumanResourcesCommandId =
	(typeof HUMAN_RESOURCES_COMMAND_IDS)[number];

export const HUMAN_RESOURCES_QUERY_EMPLOYEE_GET =
	"human-resources.employee.get" as const;

export const HUMAN_RESOURCES_QUERY_IDS = [
	HUMAN_RESOURCES_QUERY_EMPLOYEE_GET,
] as const;

export type HumanResourcesQueryId = (typeof HUMAN_RESOURCES_QUERY_IDS)[number];
