import { fail, ok, type Result } from "@afenda/errors/result";
import { buildMutationMeta } from "../shared/mutation-meta";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_UPDATE,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_GET,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_LIST,
} from "../module-ids";
import {
	createEmployeeInputSchema,
	getEmployeeByIdInputSchema,
	listEmployeesInputSchema,
	updateEmployeeInputSchema,
} from "../schemas/core";
import { runCoreCommand, runCoreQuery } from "../shared/core-command";
import { normalizeEmployeeNumber } from "../shared/employee-number";
import { fingerprintEmployeeCreate } from "../shared/fingerprint";
import type { Employee, EmployeeListPage } from "../types";

export async function createEmployee(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employee>> {
	return runCoreCommand(input, options, {
		schema: createEmployeeInputSchema,
		invalidMessage: "Invalid employee create input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CREATE,
		execute: async (data, { store, ports }) => {
			const numberResult = normalizeEmployeeNumber(data.employeeNumber);
			if (!numberResult.ok) {
				return numberResult;
			}

			const requestFingerprint = fingerprintEmployeeCreate({
				employeeNumber: numberResult.data.employeeNumber,
				legalName: data.legalName,
			});

			const existingByKey = await store.findEmployeeByIdempotencyKey({
				organizationId: data.organizationId,
				idempotencyKey: data.idempotencyKey,
			});
			if (!existingByKey.ok) {
				return existingByKey;
			}
			if (existingByKey.data !== null) {
				if (existingByKey.data.createRequestFingerprint !== requestFingerprint) {
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok(existingByKey.data.employee);
			}

			return store.createEmployee(
				{
					organizationId: data.organizationId,
					employeeNumber: numberResult.data.employeeNumber,
					normalizedEmployeeNumber: numberResult.data.normalizedEmployeeNumber,
					legalName: data.legalName.trim(),
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({ correlationId: data.correlationId, operation: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CREATE }),
			);
		},
	});
}

export async function updateEmployee(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employee>> {
	return runCoreCommand(input, options, {
		schema: updateEmployeeInputSchema,
		invalidMessage: "Invalid employee update input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_UPDATE,
		execute: async (data, { store, ports }) => {
			return store.updateEmployee(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					legalName: data.legalName.trim(),
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({ correlationId: data.correlationId, operation: HUMAN_RESOURCES_COMMAND_EMPLOYEE_UPDATE }),
			);
		},
	});
}

export async function getEmployeeById(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employee>> {
	return runCoreQuery(input, options, {
		schema: getEmployeeByIdInputSchema,
		invalidMessage: "Invalid employee get input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYEE_GET,
		execute: async (data, { store }) => {
			const employee = await store.getEmployeeById({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
			});
			if (!employee.ok) {
				return employee;
			}
			if (employee.data === null) {
				return fail(
					"NOT_FOUND",
					"Employee not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}
			return ok(employee.data);
		},
	});
}

export async function listEmployees(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeListPage>> {
	return runCoreQuery(input, options, {
		schema: listEmployeesInputSchema,
		invalidMessage: "Invalid employee list input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYEE_LIST,
		execute: async (data, { store }) => {
			const page = data.page ?? 1;
			const pageSize = data.pageSize ?? 20;

			return store.listEmployees({
				organizationId: data.organizationId,
				page,
				pageSize,
				employeeNumberPrefix: data.employeeNumberPrefix,
				legalNamePrefix: data.legalNamePrefix,
				employmentStatus: data.employmentStatus,
			});
		},
	});
}
