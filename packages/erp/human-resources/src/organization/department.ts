import { fail, ok, type Result } from "@afenda/errors/result";
import type { HumanResourcesCommandOptions } from "../command-options";
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
import {
	createDepartmentInputSchema,
	departmentStatusTransitionInputSchema,
	getDepartmentInputSchema,
	listDepartmentsInputSchema,
	organizationTreeInputSchema,
	updateDepartmentInputSchema,
} from "../schemas/organization";
import { buildMutationMeta } from "../shared/mutation-meta";
import {
	runOrganizationCommand,
	runOrganizationQuery,
} from "../shared/organization-command";
import type { Department, OrganizationTreePage } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_DEPARTMENT = "department" as const;
export type HumanResourcesDepartmentAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_DEPARTMENT;

export async function createDepartment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Department>> {
	return runOrganizationCommand(input, options, {
		schema: createDepartmentInputSchema,
		invalidMessage: "Invalid department create input",
		command: HUMAN_RESOURCES_COMMAND_DEPARTMENT_CREATE,
		execute: async (data, { store, ports }) => {
			return store.createDepartment(
				{
					organizationId: data.organizationId,
					code: data.code.trim(),
					name: data.name.trim(),
					parentDepartmentId: data.parentDepartmentId ?? null,
					status: data.status ?? "active",
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_DEPARTMENT_CREATE,
				}),
			);
		},
	});
}

export async function updateDepartment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Department>> {
	return runOrganizationCommand(input, options, {
		schema: updateDepartmentInputSchema,
		invalidMessage: "Invalid department update input",
		command: HUMAN_RESOURCES_COMMAND_DEPARTMENT_UPDATE,
		execute: async (data, { store, ports }) => {
			return store.updateDepartment(
				{
					organizationId: data.organizationId,
					departmentId: data.departmentId,
					name: data.name?.trim(),
					parentDepartmentId: data.parentDepartmentId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_DEPARTMENT_UPDATE,
				}),
			);
		},
	});
}

export async function activateDepartment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Department>> {
	return runOrganizationCommand(input, options, {
		schema: departmentStatusTransitionInputSchema,
		invalidMessage: "Invalid department activate input",
		command: HUMAN_RESOURCES_COMMAND_DEPARTMENT_ACTIVATE,
		execute: async (data, { store, ports }) => {
			return store.setDepartmentStatus(
				{
					organizationId: data.organizationId,
					departmentId: data.departmentId,
					status: "active",
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_DEPARTMENT_ACTIVATE,
				}),
			);
		},
	});
}

export async function archiveDepartment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Department>> {
	return runOrganizationCommand(input, options, {
		schema: departmentStatusTransitionInputSchema,
		invalidMessage: "Invalid department archive input",
		command: HUMAN_RESOURCES_COMMAND_DEPARTMENT_ARCHIVE,
		execute: async (data, { store, ports }) => {
			return store.setDepartmentStatus(
				{
					organizationId: data.organizationId,
					departmentId: data.departmentId,
					status: "archived",
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_DEPARTMENT_ARCHIVE,
				}),
			);
		},
	});
}

export async function getDepartment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Department>> {
	return runOrganizationQuery(input, options, {
		schema: getDepartmentInputSchema,
		invalidMessage: "Invalid department get input",
		query: HUMAN_RESOURCES_QUERY_DEPARTMENT_GET,
		execute: async (data, { store }) => {
			const department = await store.getDepartmentById({
				organizationId: data.organizationId,
				departmentId: data.departmentId,
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
		},
	});
}

export async function listDepartments(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<{ departments: Department[]; totalCount: number }>> {
	return runOrganizationQuery(input, options, {
		schema: listDepartmentsInputSchema,
		invalidMessage: "Invalid department list input",
		query: HUMAN_RESOURCES_QUERY_DEPARTMENT_LIST,
		execute: async (data, { store }) => {
			return store.listDepartments({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				status: data.status,
				parentDepartmentId: data.parentDepartmentId,
			});
		},
	});
}

export async function getOrganizationTree(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OrganizationTreePage>> {
	return runOrganizationQuery(input, options, {
		schema: organizationTreeInputSchema,
		invalidMessage: "Invalid organization tree input",
		query: HUMAN_RESOURCES_QUERY_ORGANIZATION_TREE,
		execute: async (data, { store }) => {
			return store.getOrganizationTree({
				organizationId: data.organizationId,
				rootDepartmentId: data.rootDepartmentId ?? null,
				maxDepth: data.maxDepth,
				maxNodes: data.maxNodes,
			});
		},
	});
}
