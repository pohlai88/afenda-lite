"use server";

import {
	createEmployee,
	createEmployeeInputSchema,
	type Employee,
	type EmployeeListPage,
	type EmployeeProfile,
	getEmployeeById,
	getEmployeeByIdInputSchema,
	getEmployeeProfile,
	getEmployeeProfileInputSchema,
	listEmployees,
	listEmployeesInputSchema,
	updateEmployee,
	updateEmployeeInputSchema,
} from "@afenda/human-resources";

import {
	hrActionSchema,
	hrMutationContextSchema as mutationContextSchema,
	withHrSessionContext as withSessionContext,
} from "@/app/actions/hr-mutation-context";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runMemberPermissionAction } from "@/app/actions/run-member-permission-action";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import { createHumanResourcesIdentityResolverPort } from "@/lib/erp/human-resources-identity-resolver-port";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

const createEmployeeActionSchema = hrActionSchema(createEmployeeInputSchema);
const updateEmployeeActionSchema = hrActionSchema(updateEmployeeInputSchema);
const getEmployeeActionSchema = hrActionSchema(getEmployeeByIdInputSchema);
const listEmployeesActionSchema = hrActionSchema(listEmployeesInputSchema);
const getEmployeeProfileActionSchema = hrActionSchema(
	getEmployeeProfileInputSchema,
);

const getOwnEmployeeProfileActionSchema = mutationContextSchema.extend({
	asOf: getEmployeeProfileInputSchema.shape.asOf,
});

export async function createEmployeeAction(input: {
	correlationId?: string;
	idempotencyKey: string;
	employeeNumber: string;
	legalName: string;
}): Promise<ActionResult<{ employee: Employee }>> {
	return runOperatorPermissionAction({
		path: "createEmployeeAction",
		permission: "human-resources.employee.create",
		safeMessage: "Could not create employee.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createEmployeeActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid employee.",
					parsed.details,
				);
			}
			const result = await createEmployee(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { employee: mapped.data } };
		},
	});
}

export async function updateEmployeeAction(input: {
	correlationId?: string;
	employeeId: string;
	legalName: string;
	expectedVersion: number;
}): Promise<ActionResult<{ employee: Employee }>> {
	return runOperatorPermissionAction({
		path: "updateEmployeeAction",
		permission: "human-resources.employee.update",
		safeMessage: "Could not update employee.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(updateEmployeeActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid employee update.",
					parsed.details,
				);
			}
			const result = await updateEmployee(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { employee: mapped.data } };
		},
	});
}

export async function getEmployeeAction(input: {
	correlationId?: string;
	employeeId: string;
}): Promise<ActionResult<{ employee: Employee }>> {
	return runOperatorPermissionAction({
		path: "getEmployeeAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not get employee.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getEmployeeActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid employee lookup.",
					parsed.details,
				);
			}
			const result = await getEmployeeById(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { employee: mapped.data } };
		},
	});
}

export async function listEmployeesAction(input?: {
	correlationId?: string;
	page?: number;
	pageSize?: number;
	employeeNumberPrefix?: string;
	legalNamePrefix?: string;
	employmentStatus?: "active" | "notice" | "terminated";
}): Promise<ActionResult<{ page: EmployeeListPage }>> {
	return runOperatorPermissionAction({
		path: "listEmployeesAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not list employees.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listEmployeesActionSchema.optional(), input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid employee list filters.",
					parsed.details,
				);
			}
			const result = await listEmployees(
				withSessionContext(session, correlationId, parsed.data ?? {}),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { page: mapped.data } };
		},
	});
}

export async function getEmployeeProfileAction(input: {
	correlationId?: string;
	employeeId: string;
	asOf: string;
	actorEmployeeId?: string;
}): Promise<ActionResult<{ profile: EmployeeProfile }>> {
	return runOperatorPermissionAction({
		path: "getEmployeeProfileAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not get employee profile.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getEmployeeProfileActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid employee profile request.",
					parsed.details,
				);
			}
			const result = await getEmployeeProfile(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { profile: mapped.data } };
		},
	});
}

export async function getOwnEmployeeProfileAction(input: {
	correlationId?: string;
	asOf: string;
}): Promise<ActionResult<{ profile: EmployeeProfile }>> {
	return runMemberPermissionAction({
		path: "getOwnEmployeeProfileAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not get your employee profile.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getOwnEmployeeProfileActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid profile request.",
					parsed.details,
				);
			}

			const identity =
				await createHumanResourcesIdentityResolverPort().resolveEmployeeForActor(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
					},
				);
			if (!identity.ok || identity.data === null) {
				return actionFail(
					"FORBIDDEN",
					"Your account is not linked to an active employee record.",
				);
			}

			const result = await getEmployeeProfile(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId: parsed.data.correlationId ?? correlationId,
					employeeId: identity.data.employeeId,
					asOf: parsed.data.asOf,
				},
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { profile: mapped.data } };
		},
	});
}
