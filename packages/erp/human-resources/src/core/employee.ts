import { errorResult, type Result } from "@afenda/errors";
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
import { normalizeEmployeeNumber } from "../shared/employee-number";
import { fingerprintEmployeeCreate } from "../shared/fingerprint";
import { buildMutationMeta } from "../shared/mutation-meta";
import type { Employee, EmployeeListPage } from "../types";
import {
	runWorkforceFoundationCommand,
	runWorkforceFoundationQuery,
} from "../workforce-foundation/run-operation";

export function createEmployee(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employee>> {
	return runWorkforceFoundationCommand(input, options, {
		schema: createEmployeeInputSchema,
		invalidMessage: "Invalid employee create input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CREATE,
		storeMethods: ["findEmployeeByIdempotencyKey", "createEmployee"],
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
				if (
					existingByKey.data.createRequestFingerprint !== requestFingerprint
				) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CONFLICT,
						),
					});
				}
				return errorResult.ok(existingByKey.data.employee);
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
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CREATE,
				}),
			);
		},
	});
}

export function updateEmployee(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employee>> {
	return runWorkforceFoundationCommand(input, options, {
		schema: updateEmployeeInputSchema,
		invalidMessage: "Invalid employee update input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_UPDATE,
		storeMethods: ["updateEmployee"],
		execute: async (data, { store, ports }) =>
			store.updateEmployee(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					legalName: data.legalName.trim(),
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_EMPLOYEE_UPDATE,
				}),
			),
	});
}

export function getEmployeeById(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employee>> {
	return runWorkforceFoundationQuery(input, options, {
		schema: getEmployeeByIdInputSchema,
		invalidMessage: "Invalid employee get input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYEE_GET,
		storeMethods: ["getEmployeeById"],
		execute: async (data, { store }) => {
			const employee = await store.getEmployeeById({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
			});
			if (!employee.ok) {
				return employee;
			}
			if (employee.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}
			return errorResult.ok(employee.data);
		},
	});
}

export function listEmployees(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeListPage>> {
	return runWorkforceFoundationQuery(input, options, {
		schema: listEmployeesInputSchema,
		invalidMessage: "Invalid employee list input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYEE_LIST,
		storeMethods: ["listEmployees"],
		execute: (data, { store }) => {
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
