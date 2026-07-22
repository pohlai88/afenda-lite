import { fail, ok, type Result } from "@afenda/errors/result";

import {
	requireHumanResourcesCommandPermission,
	requireHumanResourcesQueryPermission,
} from "../authorization";
import {
	type HumanResourcesCommandOptions,
	resolveCommandDeps,
} from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_DEPARTMENT_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_DEPARTMENT_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_DEPARTMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_DEPARTMENT_UPDATE,
	HUMAN_RESOURCES_QUERY_DEPARTMENT_GET,
	HUMAN_RESOURCES_QUERY_DEPARTMENT_LIST,
	HUMAN_RESOURCES_QUERY_ORGANIZATION_TREE,
} from "../module-ids";
import { parseHumanResourcesInput } from "../parse-input";
import {
	createDepartmentInputSchema,
	departmentStatusTransitionInputSchema,
	getDepartmentInputSchema,
	listDepartmentsInputSchema,
	organizationTreeInputSchema,
	updateDepartmentInputSchema,
} from "../schemas/organization";
import type { Department, OrganizationTreePage } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_DEPARTMENT = "department" as const;
export type HumanResourcesDepartmentAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_DEPARTMENT;

export async function createDepartment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Department>> {
	const parsed = parseHumanResourcesInput(
		createDepartmentInputSchema,
		input,
		"Invalid department create input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesCommandPermission(
		authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: HUMAN_RESOURCES_COMMAND_DEPARTMENT_CREATE,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	return store.createDepartment(
		{
			organizationId: parsed.data.organizationId,
			code: parsed.data.code.trim(),
			name: parsed.data.name.trim(),
			parentDepartmentId: parsed.data.parentDepartmentId ?? null,
			status: parsed.data.status ?? "active",
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function updateDepartment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Department>> {
	const parsed = parseHumanResourcesInput(
		updateDepartmentInputSchema,
		input,
		"Invalid department update input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesCommandPermission(
		authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: HUMAN_RESOURCES_COMMAND_DEPARTMENT_UPDATE,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	return store.updateDepartment(
		{
			organizationId: parsed.data.organizationId,
			departmentId: parsed.data.departmentId,
			name: parsed.data.name?.trim(),
			parentDepartmentId: parsed.data.parentDepartmentId,
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function activateDepartment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Department>> {
	const parsed = parseHumanResourcesInput(
		departmentStatusTransitionInputSchema,
		input,
		"Invalid department activate input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesCommandPermission(
		authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: HUMAN_RESOURCES_COMMAND_DEPARTMENT_ACTIVATE,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	return store.setDepartmentStatus(
		{
			organizationId: parsed.data.organizationId,
			departmentId: parsed.data.departmentId,
			status: "active",
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function archiveDepartment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Department>> {
	const parsed = parseHumanResourcesInput(
		departmentStatusTransitionInputSchema,
		input,
		"Invalid department archive input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, ports, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesCommandPermission(
		authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: HUMAN_RESOURCES_COMMAND_DEPARTMENT_ARCHIVE,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	return store.setDepartmentStatus(
		{
			organizationId: parsed.data.organizationId,
			departmentId: parsed.data.departmentId,
			status: "archived",
			expectedVersion: parsed.data.expectedVersion,
			actorUserId: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function getDepartment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Department>> {
	const parsed = parseHumanResourcesInput(
		getDepartmentInputSchema,
		input,
		"Invalid department get input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: HUMAN_RESOURCES_QUERY_DEPARTMENT_GET,
	});
	if (!authorized.ok) {
		return authorized;
	}

	const department = await store.getDepartmentById({
		organizationId: parsed.data.organizationId,
		departmentId: parsed.data.departmentId,
	});
	if (!department.ok) {
		return department;
	}
	if (department.data === null) {
		return fail(
			"NOT_FOUND",
			"Department not found",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
		);
	}
	return ok(department.data);
}

export async function listDepartments(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<{ departments: Department[]; totalCount: number }>> {
	const parsed = parseHumanResourcesInput(
		listDepartmentsInputSchema,
		input,
		"Invalid department list input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: HUMAN_RESOURCES_QUERY_DEPARTMENT_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}

	return store.listDepartments({
		organizationId: parsed.data.organizationId,
		page: parsed.data.page ?? 1,
		pageSize: parsed.data.pageSize ?? 20,
		status: parsed.data.status,
		parentDepartmentId: parsed.data.parentDepartmentId,
	});
}

export async function getOrganizationTree(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OrganizationTreePage>> {
	const parsed = parseHumanResourcesInput(
		organizationTreeInputSchema,
		input,
		"Invalid organization tree input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: HUMAN_RESOURCES_QUERY_ORGANIZATION_TREE,
	});
	if (!authorized.ok) {
		return authorized;
	}

	return store.getOrganizationTree({
		organizationId: parsed.data.organizationId,
		rootDepartmentId: parsed.data.rootDepartmentId ?? null,
		maxDepth: parsed.data.maxDepth,
		maxNodes: parsed.data.maxNodes,
	});
}
