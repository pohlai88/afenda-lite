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
import { parseHumanResourcesInput } from "../parse-input";
import {
	createEmployeeInputSchema,
	getEmployeeByIdInputSchema,
	listEmployeesInputSchema,
	updateEmployeeInputSchema,
} from "../schemas";
import { normalizeEmployeeNumber } from "../shared/employee-number";
import { fingerprintEmployeeCreate } from "../shared/fingerprint";
import type { Employee, EmployeeListPage } from "../types";

export async function createEmployee(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employee>> {
	const parsed = parseHumanResourcesInput(
		createEmployeeInputSchema,
		input,
		"Invalid employee create input",
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
			command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CREATE,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	const numberResult = normalizeEmployeeNumber(parsed.data.employeeNumber);
	if (!numberResult.ok) {
		return numberResult;
	}

	const requestFingerprint = fingerprintEmployeeCreate({
		employeeNumber: numberResult.data.employeeNumber,
		legalName: parsed.data.legalName,
	});

	const existingByKey = await store.findEmployeeByIdempotencyKey({
		organizationId: parsed.data.organizationId,
		idempotencyKey: parsed.data.idempotencyKey,
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
			organizationId: parsed.data.organizationId,
			employeeNumber: numberResult.data.employeeNumber,
			normalizedEmployeeNumber: numberResult.data.normalizedEmployeeNumber,
			legalName: parsed.data.legalName.trim(),
			createIdempotencyKey: parsed.data.idempotencyKey,
			createRequestFingerprint: requestFingerprint,
			createdBy: parsed.data.actorUserId,
		},
		ports,
		{ correlationId: parsed.data.correlationId },
	);
}

export async function updateEmployee(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employee>> {
	const parsed = parseHumanResourcesInput(
		updateEmployeeInputSchema,
		input,
		"Invalid employee update input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesCommandPermission(
		authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_UPDATE,
		},
	);
	if (!authorized.ok) {
		return authorized;
	}

	return store.updateEmployee({
		organizationId: parsed.data.organizationId,
		employeeId: parsed.data.employeeId,
		legalName: parsed.data.legalName.trim(),
		expectedVersion: parsed.data.expectedVersion,
		actorUserId: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
	});
}

export async function getEmployeeById(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employee>> {
	const parsed = parseHumanResourcesInput(
		getEmployeeByIdInputSchema,
		input,
		"Invalid employee get input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: HUMAN_RESOURCES_QUERY_EMPLOYEE_GET,
	});
	if (!authorized.ok) {
		return authorized;
	}

	const employee = await store.getEmployeeById({
		organizationId: parsed.data.organizationId,
		employeeId: parsed.data.employeeId,
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
}

export async function listEmployees(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeListPage>> {
	const parsed = parseHumanResourcesInput(
		listEmployeesInputSchema,
		input,
		"Invalid employee list input",
	);
	if (!parsed.ok) {
		return parsed;
	}

	const { store, authorization } = resolveCommandDeps(options);
	const authorized = await requireHumanResourcesQueryPermission(authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: HUMAN_RESOURCES_QUERY_EMPLOYEE_LIST,
	});
	if (!authorized.ok) {
		return authorized;
	}

	const page = parsed.data.page ?? 1;
	const pageSize = parsed.data.pageSize ?? 20;

	return store.listEmployees({
		organizationId: parsed.data.organizationId,
		page,
		pageSize,
		employeeNumberPrefix: parsed.data.employeeNumberPrefix,
		legalNamePrefix: parsed.data.legalNamePrefix,
		employmentStatus: parsed.data.employmentStatus,
	});
}
