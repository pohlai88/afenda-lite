import {
	defineHumanResourcesOperationRegistry,
	projectHumanResourcesAuthorization,
	projectHumanResourcesOperationIds,
} from "../operation-registry/define-registry";
import {
	HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE,
	HUMAN_RESOURCES_PERMISSION_ORGANIZATION_READ,
} from "../permissions";

const ORGANIZATION_OWNER = "organization" as const;
const MANIFEST_ONLY_POLICY = "hr.manifest-only" as const;
const ORGANIZATION_POLICY = "hr.organization" as const;

const MANIFEST_ONLY_COMMAND = {
	authorizationPolicy: MANIFEST_ONLY_POLICY,
	kind: "command",
	owner: ORGANIZATION_OWNER,
	permission: HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE,
} as const;
const SCOPED_COMMAND = {
	authorizationPolicy: ORGANIZATION_POLICY,
	kind: "command",
	owner: ORGANIZATION_OWNER,
	permission: HUMAN_RESOURCES_PERMISSION_ORGANIZATION_MANAGE,
} as const;
const MANIFEST_ONLY_QUERY = {
	authorizationPolicy: MANIFEST_ONLY_POLICY,
	kind: "query",
	owner: ORGANIZATION_OWNER,
	permission: HUMAN_RESOURCES_PERMISSION_ORGANIZATION_READ,
} as const;
const SCOPED_QUERY = {
	authorizationPolicy: ORGANIZATION_POLICY,
	kind: "query",
	owner: ORGANIZATION_OWNER,
	permission: HUMAN_RESOURCES_PERMISSION_ORGANIZATION_READ,
} as const;

export const HUMAN_RESOURCES_ORGANIZATION_COMMANDS =
	defineHumanResourcesOperationRegistry({
		createDepartment: {
			...MANIFEST_ONLY_COMMAND,
			id: "human-resources.department.create",
			publicName: "createDepartment",
		},
		updateDepartment: {
			...MANIFEST_ONLY_COMMAND,
			id: "human-resources.department.update",
			publicName: "updateDepartment",
		},
		activateDepartment: {
			...MANIFEST_ONLY_COMMAND,
			id: "human-resources.department.activate",
			publicName: "activateDepartment",
		},
		archiveDepartment: {
			...MANIFEST_ONLY_COMMAND,
			id: "human-resources.department.archive",
			publicName: "archiveDepartment",
		},
		createJob: {
			...MANIFEST_ONLY_COMMAND,
			id: "human-resources.job.create",
			publicName: "createJob",
		},
		updateJob: {
			...MANIFEST_ONLY_COMMAND,
			id: "human-resources.job.update",
			publicName: "updateJob",
		},
		activateJob: {
			...MANIFEST_ONLY_COMMAND,
			id: "human-resources.job.activate",
			publicName: "activateJob",
		},
		archiveJob: {
			...MANIFEST_ONLY_COMMAND,
			id: "human-resources.job.archive",
			publicName: "archiveJob",
		},
		createPosition: {
			...MANIFEST_ONLY_COMMAND,
			id: "human-resources.position.create",
			publicName: "createPosition",
		},
		updatePosition: {
			...MANIFEST_ONLY_COMMAND,
			id: "human-resources.position.update",
			publicName: "updatePosition",
		},
		activatePosition: {
			...MANIFEST_ONLY_COMMAND,
			id: "human-resources.position.activate",
			publicName: "activatePosition",
		},
		freezePosition: {
			...MANIFEST_ONLY_COMMAND,
			id: "human-resources.position.freeze",
			publicName: "freezePosition",
		},
		closePosition: {
			...MANIFEST_ONLY_COMMAND,
			id: "human-resources.position.close",
			publicName: "closePosition",
		},
		assignPrimaryReportingLine: {
			...SCOPED_COMMAND,
			id: "human-resources.reporting-line.assign-primary",
			publicName: "assignPrimaryReportingLine",
		},
		closeReportingLine: {
			...SCOPED_COMMAND,
			id: "human-resources.reporting-line.close",
			publicName: "closeReportingLine",
		},
		replacePrimaryReportingLine: {
			...SCOPED_COMMAND,
			id: "human-resources.reporting-line.replace-primary",
			publicName: "replacePrimaryReportingLine",
		},
	});

export const HUMAN_RESOURCES_ORGANIZATION_QUERIES =
	defineHumanResourcesOperationRegistry({
		getDepartmentAsOf: {
			...MANIFEST_ONLY_QUERY,
			id: "human-resources.department.as-of",
			publicName: "getDepartmentAsOf",
		},
		getDepartment: {
			...MANIFEST_ONLY_QUERY,
			id: "human-resources.department.get",
			publicName: "getDepartment",
		},
		listDepartments: {
			...MANIFEST_ONLY_QUERY,
			id: "human-resources.department.list",
			publicName: "listDepartments",
		},
		getOrganizationTreeAsOf: {
			...SCOPED_QUERY,
			id: "human-resources.organization.tree-as-of",
			publicName: "getOrganizationTreeAsOf",
		},
		getOrganizationTree: {
			...SCOPED_QUERY,
			id: "human-resources.organization.tree",
			publicName: "getOrganizationTree",
		},
		getJobAsOf: {
			...MANIFEST_ONLY_QUERY,
			id: "human-resources.job.as-of",
			publicName: "getJobAsOf",
		},
		getJob: {
			...MANIFEST_ONLY_QUERY,
			id: "human-resources.job.get",
			publicName: "getJob",
		},
		listJobs: {
			...MANIFEST_ONLY_QUERY,
			id: "human-resources.job.list",
			publicName: "listJobs",
		},
		getPositionAsOf: {
			...MANIFEST_ONLY_QUERY,
			id: "human-resources.position.as-of",
			publicName: "getPositionAsOf",
		},
		getPosition: {
			...MANIFEST_ONLY_QUERY,
			id: "human-resources.position.get",
			publicName: "getPosition",
		},
		listPositions: {
			...MANIFEST_ONLY_QUERY,
			id: "human-resources.position.list",
			publicName: "listPositions",
		},
		getPositionOccupancyAsOf: {
			...MANIFEST_ONLY_QUERY,
			id: "human-resources.position.occupancy-as-of",
			publicName: "getPositionOccupancyAsOf",
		},
		resolvePrimaryManager: {
			...SCOPED_QUERY,
			id: "human-resources.reporting-line.resolve-primary-manager",
			publicName: "resolvePrimaryManager",
		},
		listDirectReports: {
			...SCOPED_QUERY,
			id: "human-resources.reporting-line.list-direct-reports",
			publicName: "listDirectReports",
		},
	});

export const HUMAN_RESOURCES_COMMAND_DEPARTMENT_CREATE =
	HUMAN_RESOURCES_ORGANIZATION_COMMANDS.createDepartment.id;
export const HUMAN_RESOURCES_COMMAND_DEPARTMENT_UPDATE =
	HUMAN_RESOURCES_ORGANIZATION_COMMANDS.updateDepartment.id;
export const HUMAN_RESOURCES_COMMAND_DEPARTMENT_ACTIVATE =
	HUMAN_RESOURCES_ORGANIZATION_COMMANDS.activateDepartment.id;
export const HUMAN_RESOURCES_COMMAND_DEPARTMENT_ARCHIVE =
	HUMAN_RESOURCES_ORGANIZATION_COMMANDS.archiveDepartment.id;
export const HUMAN_RESOURCES_COMMAND_JOB_CREATE =
	HUMAN_RESOURCES_ORGANIZATION_COMMANDS.createJob.id;
export const HUMAN_RESOURCES_COMMAND_JOB_UPDATE =
	HUMAN_RESOURCES_ORGANIZATION_COMMANDS.updateJob.id;
export const HUMAN_RESOURCES_COMMAND_JOB_ACTIVATE =
	HUMAN_RESOURCES_ORGANIZATION_COMMANDS.activateJob.id;
export const HUMAN_RESOURCES_COMMAND_JOB_ARCHIVE =
	HUMAN_RESOURCES_ORGANIZATION_COMMANDS.archiveJob.id;
export const HUMAN_RESOURCES_COMMAND_POSITION_CREATE =
	HUMAN_RESOURCES_ORGANIZATION_COMMANDS.createPosition.id;
export const HUMAN_RESOURCES_COMMAND_POSITION_UPDATE =
	HUMAN_RESOURCES_ORGANIZATION_COMMANDS.updatePosition.id;
export const HUMAN_RESOURCES_COMMAND_POSITION_ACTIVATE =
	HUMAN_RESOURCES_ORGANIZATION_COMMANDS.activatePosition.id;
export const HUMAN_RESOURCES_COMMAND_POSITION_FREEZE =
	HUMAN_RESOURCES_ORGANIZATION_COMMANDS.freezePosition.id;
export const HUMAN_RESOURCES_COMMAND_POSITION_CLOSE =
	HUMAN_RESOURCES_ORGANIZATION_COMMANDS.closePosition.id;
export const HUMAN_RESOURCES_COMMAND_REPORTING_LINE_ASSIGN_PRIMARY =
	HUMAN_RESOURCES_ORGANIZATION_COMMANDS.assignPrimaryReportingLine.id;
export const HUMAN_RESOURCES_COMMAND_REPORTING_LINE_CLOSE =
	HUMAN_RESOURCES_ORGANIZATION_COMMANDS.closeReportingLine.id;
export const HUMAN_RESOURCES_COMMAND_REPORTING_LINE_REPLACE_PRIMARY =
	HUMAN_RESOURCES_ORGANIZATION_COMMANDS.replacePrimaryReportingLine.id;

export const HUMAN_RESOURCES_QUERY_DEPARTMENT_AS_OF =
	HUMAN_RESOURCES_ORGANIZATION_QUERIES.getDepartmentAsOf.id;
export const HUMAN_RESOURCES_QUERY_DEPARTMENT_GET =
	HUMAN_RESOURCES_ORGANIZATION_QUERIES.getDepartment.id;
export const HUMAN_RESOURCES_QUERY_DEPARTMENT_LIST =
	HUMAN_RESOURCES_ORGANIZATION_QUERIES.listDepartments.id;
export const HUMAN_RESOURCES_QUERY_ORGANIZATION_TREE_AS_OF =
	HUMAN_RESOURCES_ORGANIZATION_QUERIES.getOrganizationTreeAsOf.id;
export const HUMAN_RESOURCES_QUERY_ORGANIZATION_TREE =
	HUMAN_RESOURCES_ORGANIZATION_QUERIES.getOrganizationTree.id;
export const HUMAN_RESOURCES_QUERY_JOB_AS_OF =
	HUMAN_RESOURCES_ORGANIZATION_QUERIES.getJobAsOf.id;
export const HUMAN_RESOURCES_QUERY_JOB_GET =
	HUMAN_RESOURCES_ORGANIZATION_QUERIES.getJob.id;
export const HUMAN_RESOURCES_QUERY_JOB_LIST =
	HUMAN_RESOURCES_ORGANIZATION_QUERIES.listJobs.id;
export const HUMAN_RESOURCES_QUERY_POSITION_AS_OF =
	HUMAN_RESOURCES_ORGANIZATION_QUERIES.getPositionAsOf.id;
export const HUMAN_RESOURCES_QUERY_POSITION_GET =
	HUMAN_RESOURCES_ORGANIZATION_QUERIES.getPosition.id;
export const HUMAN_RESOURCES_QUERY_POSITION_LIST =
	HUMAN_RESOURCES_ORGANIZATION_QUERIES.listPositions.id;
export const HUMAN_RESOURCES_QUERY_POSITION_OCCUPANCY_AS_OF =
	HUMAN_RESOURCES_ORGANIZATION_QUERIES.getPositionOccupancyAsOf.id;
export const HUMAN_RESOURCES_QUERY_REPORTING_LINE_RESOLVE_PRIMARY_MANAGER =
	HUMAN_RESOURCES_ORGANIZATION_QUERIES.resolvePrimaryManager.id;
export const HUMAN_RESOURCES_QUERY_REPORTING_LINE_LIST_DIRECT_REPORTS =
	HUMAN_RESOURCES_ORGANIZATION_QUERIES.listDirectReports.id;

export const HUMAN_RESOURCES_ORGANIZATION_COMMAND_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_ORGANIZATION_COMMANDS);
export const HUMAN_RESOURCES_ORGANIZATION_QUERY_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_ORGANIZATION_QUERIES);

export const HUMAN_RESOURCES_ORGANIZATION_COMMAND_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_ORGANIZATION_COMMANDS);
export const HUMAN_RESOURCES_ORGANIZATION_QUERY_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_ORGANIZATION_QUERIES);
