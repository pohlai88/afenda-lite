import { errorResult, type Result } from "@afenda/errors";
import type { Department, OrganizationTreePage } from "../../kernel/contracts";
import { buildMutationMeta } from "../../kernel/emissions/mutation-meta";
import type { HumanResourcesCommandOptions } from "../../kernel/execution/command-options";
import {
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
import {
	HUMAN_RESOURCES_COMMAND_DEPARTMENT_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_DEPARTMENT_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_DEPARTMENT_CREATE,
	HUMAN_RESOURCES_COMMAND_DEPARTMENT_UPDATE,
	HUMAN_RESOURCES_QUERY_DEPARTMENT_AS_OF,
	HUMAN_RESOURCES_QUERY_DEPARTMENT_GET,
	HUMAN_RESOURCES_QUERY_DEPARTMENT_LIST,
	HUMAN_RESOURCES_QUERY_ORGANIZATION_TREE,
	HUMAN_RESOURCES_QUERY_ORGANIZATION_TREE_AS_OF,
} from "../../kernel/operations/module-ids";
import type { DepartmentStructureAtAsOf } from "./organization-structure-lineage";
import { runOrganizationCommand, runOrganizationQuery } from "./run-operation";
import {
	createDepartmentInputSchema,
	departmentStatusTransitionInputSchema,
	getDepartmentAsOfInputSchema,
	getDepartmentInputSchema,
	listDepartmentsInputSchema,
	organizationTreeAsOfInputSchema,
	organizationTreeInputSchema,
	updateDepartmentInputSchema,
} from "./schema";

export const HUMAN_RESOURCES_AGGREGATE_DEPARTMENT = "department" as const;
export type HumanResourcesDepartmentAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_DEPARTMENT;

export function createDepartment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Department>> {
	return runOrganizationCommand(input, options, {
		schema: createDepartmentInputSchema,
		invalidMessage: "Invalid department create input",
		command: HUMAN_RESOURCES_COMMAND_DEPARTMENT_CREATE,
		storeMethods: ["createDepartment"],
		execute: async (data, { store, ports }) =>
			store.createDepartment(
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
					operationId: HUMAN_RESOURCES_COMMAND_DEPARTMENT_CREATE,
				}),
			),
	});
}

export function updateDepartment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Department>> {
	return runOrganizationCommand(input, options, {
		schema: updateDepartmentInputSchema,
		invalidMessage: "Invalid department update input",
		command: HUMAN_RESOURCES_COMMAND_DEPARTMENT_UPDATE,
		storeMethods: ["updateDepartment"],
		execute: async (data, { store, ports }) =>
			store.updateDepartment(
				{
					organizationId: data.organizationId,
					departmentId: data.departmentId,
					name: data.name?.trim(),
					parentDepartmentId: data.parentDepartmentId,
					effectiveOn: data.effectiveOn,
					reasonCode: data.reasonCode,
					evidenceRef: data.evidenceRef,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_DEPARTMENT_UPDATE,
				}),
			),
	});
}

export function activateDepartment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Department>> {
	return runOrganizationCommand(input, options, {
		schema: departmentStatusTransitionInputSchema,
		invalidMessage: "Invalid department activate input",
		command: HUMAN_RESOURCES_COMMAND_DEPARTMENT_ACTIVATE,
		storeMethods: ["setDepartmentStatus"],
		execute: async (data, { store, ports }) =>
			store.setDepartmentStatus(
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
					operationId: HUMAN_RESOURCES_COMMAND_DEPARTMENT_ACTIVATE,
				}),
			),
	});
}

export function archiveDepartment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Department>> {
	return runOrganizationCommand(input, options, {
		schema: departmentStatusTransitionInputSchema,
		invalidMessage: "Invalid department archive input",
		command: HUMAN_RESOURCES_COMMAND_DEPARTMENT_ARCHIVE,
		storeMethods: ["setDepartmentStatus"],
		execute: async (data, { store, ports }) =>
			store.setDepartmentStatus(
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
					operationId: HUMAN_RESOURCES_COMMAND_DEPARTMENT_ARCHIVE,
				}),
			),
	});
}

export function getDepartment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Department>> {
	return runOrganizationQuery(input, options, {
		schema: getDepartmentInputSchema,
		invalidMessage: "Invalid department get input",
		query: HUMAN_RESOURCES_QUERY_DEPARTMENT_GET,
		storeMethods: ["getDepartmentById"],
		execute: async (data, { store }) => {
			const department = await store.getDepartmentById({
				organizationId: data.organizationId,
				departmentId: data.departmentId,
			});
			if (!department.ok) {
				return department;
			}
			if (department.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}
			return errorResult.ok(department.data);
		},
	});
}

export function listDepartments(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<{ departments: Department[]; totalCount: number }>> {
	return runOrganizationQuery(input, options, {
		schema: listDepartmentsInputSchema,
		invalidMessage: "Invalid department list input",
		query: HUMAN_RESOURCES_QUERY_DEPARTMENT_LIST,
		storeMethods: ["listDepartments"],
		execute: async (data, { store }) =>
			store.listDepartments({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				status: data.status,
				parentDepartmentId: data.parentDepartmentId,
			}),
	});
}

export function getOrganizationTree(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OrganizationTreePage>> {
	return runOrganizationQuery(input, options, {
		schema: organizationTreeInputSchema,
		invalidMessage: "Invalid organization tree input",
		query: HUMAN_RESOURCES_QUERY_ORGANIZATION_TREE,
		storeMethods: ["getOrganizationTree"],
		execute: async (data, { store }) =>
			store.getOrganizationTree({
				organizationId: data.organizationId,
				rootDepartmentId: data.rootDepartmentId ?? null,
				maxDepth: data.maxDepth,
				maxNodes: data.maxNodes,
			}),
	});
}

export function getDepartmentAsOf(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<DepartmentStructureAtAsOf>> {
	return runOrganizationQuery(input, options, {
		schema: getDepartmentAsOfInputSchema,
		invalidMessage: "Invalid department as-of input",
		query: HUMAN_RESOURCES_QUERY_DEPARTMENT_AS_OF,
		storeMethods: ["findDepartmentAsOf"],
		execute: async (data, { store }) => {
			const department = await store.findDepartmentAsOf({
				organizationId: data.organizationId,
				departmentId: data.departmentId,
				asOf: data.asOf,
			});
			if (!department.ok) {
				return department;
			}
			if (department.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}
			return errorResult.ok(department.data);
		},
	});
}

export function getOrganizationTreeAsOf(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<OrganizationTreePage>> {
	return runOrganizationQuery(input, options, {
		schema: organizationTreeAsOfInputSchema,
		invalidMessage: "Invalid organization tree as-of input",
		query: HUMAN_RESOURCES_QUERY_ORGANIZATION_TREE_AS_OF,
		storeMethods: ["getOrganizationTreeAsOf"],
		execute: async (data, { store }) =>
			store.getOrganizationTreeAsOf({
				organizationId: data.organizationId,
				asOf: data.asOf,
				rootDepartmentId: data.rootDepartmentId ?? null,
				maxDepth: data.maxDepth,
				maxNodes: data.maxNodes,
			}),
	});
}
