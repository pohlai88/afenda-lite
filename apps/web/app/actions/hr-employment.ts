"use server";

import {
	amendEmployment,
	amendEmploymentContract,
	correctEmployment,
	createEmploymentContract,
	type Employment,
	type EmploymentContract,
	type EmploymentStatusHistory,
	endEmploymentContract,
	getCurrentEmploymentContract,
	getEmployment,
	getEmploymentAsOf,
	getEmploymentContract,
	getEmploymentContractAsOf,
	hireEmployment,
	listEmploymentContracts,
	listEmploymentStatusHistory,
	reactivateEmployment,
	rehireEmployment,
	renewEmploymentContract,
	supersedeEmploymentContract,
	suspendEmployment,
	terminateEmployment,
} from "@afenda/human-resources";
import { z } from "zod";

import {
	hrMutationContextSchema as mutationContextSchema,
	withHrSessionContext as withSessionContext,
} from "@/app/actions/hr-mutation-context";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runHrWorkforceOperatorPermissionAction as runOperatorPermissionAction } from "@/app/actions/run-hr-operator-permission-action";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const employmentStatusSchema = z.enum(["active", "notice", "terminated"]);

const createEmploymentActionSchema = mutationContextSchema.extend({
	employeeId: z.string().uuid(),
	startsOn: isoDateSchema,
	endsOn: isoDateSchema.nullable().optional(),
});

const amendEmploymentActionSchema = mutationContextSchema.extend({
	employmentId: z.string().uuid(),
	status: employmentStatusSchema.optional(),
	startsOn: isoDateSchema.optional(),
	endsOn: isoDateSchema.nullable().optional(),
	effectiveOn: isoDateSchema.optional(),
	expectedVersion: z.number().int().positive(),
});

const amendEmploymentLifecycleActionSchema = mutationContextSchema.extend({
	employmentId: z.string().uuid(),
	startsOn: isoDateSchema.optional(),
	endsOn: isoDateSchema.nullable().optional(),
	effectiveOn: isoDateSchema.optional(),
	expectedVersion: z.number().int().positive(),
});

const correctEmploymentActionSchema = mutationContextSchema.extend({
	employmentId: z.string().uuid(),
	status: employmentStatusSchema.optional(),
	startsOn: isoDateSchema.optional(),
	endsOn: isoDateSchema.nullable().optional(),
	reason: z.string().trim().min(1).max(500),
	evidenceReference: z.string().trim().min(1).max(200).optional(),
	effectiveOn: isoDateSchema.optional(),
	expectedVersion: z.number().int().positive(),
});

const createEmploymentContractActionSchema = mutationContextSchema.extend({
	employmentId: z.string().uuid(),
	referenceCode: z.string().trim().min(1).max(64),
	startsOn: isoDateSchema,
	endsOn: isoDateSchema.nullable().optional(),
	reasonCode: z.string().trim().min(1).max(64),
	sourceReference: z.string().trim().min(1).max(200).optional(),
});

const correctEmploymentContractActionSchema = mutationContextSchema.extend({
	employmentContractId: z.string().uuid(),
	referenceCode: z.string().trim().min(1).max(64).optional(),
	startsOn: isoDateSchema.optional(),
	endsOn: isoDateSchema.nullable().optional(),
	reasonCode: z.string().trim().min(1).max(64),
	sourceReference: z.string().trim().min(1).max(200),
	expectedVersion: z.number().int().positive(),
});

const supersedeEmploymentContractActionSchema = mutationContextSchema.extend({
	employmentContractId: z.string().uuid(),
	referenceCode: z.string().trim().min(1).max(64).optional(),
	startsOn: isoDateSchema,
	endsOn: isoDateSchema.nullable().optional(),
	reasonCode: z.string().trim().min(1).max(64),
	sourceReference: z.string().trim().min(1).max(200),
	expectedVersion: z.number().int().positive(),
});

const endEmploymentContractActionSchema = mutationContextSchema.extend({
	employmentContractId: z.string().uuid(),
	endsOn: isoDateSchema,
	reasonCode: z.string().trim().min(1).max(64),
	sourceReference: z.string().trim().min(1).max(200),
	expectedVersion: z.number().int().positive(),
});

export async function hireEmploymentAction(input: {
	correlationId?: string;
	employeeId: string;
	startsOn: string;
	endsOn?: string | null;
}): Promise<ActionResult<{ employment: Employment }>> {
	return await runOperatorPermissionAction({
		path: "hireEmploymentAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not hire employment.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createEmploymentActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid employment hire.",
					parsed.details,
				);
			}
			const result = await hireEmployment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { employment: mapped.data } };
		},
	});
}

export async function rehireEmploymentAction(input: {
	correlationId?: string;
	employeeId: string;
	startsOn: string;
	endsOn?: string | null;
}): Promise<ActionResult<{ employment: Employment }>> {
	return await runOperatorPermissionAction({
		path: "rehireEmploymentAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not rehire employment.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createEmploymentActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid employment rehire.",
					parsed.details,
				);
			}
			const result = await rehireEmployment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { employment: mapped.data } };
		},
	});
}

export async function amendEmploymentAction(input: {
	correlationId?: string;
	employmentId: string;
	status?: "active" | "notice" | "terminated";
	startsOn?: string;
	endsOn?: string | null;
	effectiveOn?: string;
	expectedVersion: number;
}): Promise<ActionResult<{ employment: Employment }>> {
	return await runOperatorPermissionAction({
		path: "amendEmploymentAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not amend employment.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(amendEmploymentActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid employment amend.",
					parsed.details,
				);
			}
			const result = await amendEmployment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { employment: mapped.data } };
		},
	});
}

export async function suspendEmploymentAction(input: {
	correlationId?: string;
	employmentId: string;
	startsOn?: string;
	endsOn?: string | null;
	effectiveOn?: string;
	expectedVersion: number;
}): Promise<ActionResult<{ employment: Employment }>> {
	return await runOperatorPermissionAction({
		path: "suspendEmploymentAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not suspend employment.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(amendEmploymentLifecycleActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid employment suspend request.",
					parsed.details,
				);
			}
			const result = await suspendEmployment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { employment: mapped.data } };
		},
	});
}

export async function reactivateEmploymentAction(input: {
	correlationId?: string;
	employmentId: string;
	startsOn?: string;
	endsOn?: string | null;
	effectiveOn?: string;
	expectedVersion: number;
}): Promise<ActionResult<{ employment: Employment }>> {
	return await runOperatorPermissionAction({
		path: "reactivateEmploymentAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not reactivate employment.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(amendEmploymentLifecycleActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid employment reactivation.",
					parsed.details,
				);
			}
			const result = await reactivateEmployment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { employment: mapped.data } };
		},
	});
}

export async function terminateEmploymentAction(input: {
	correlationId?: string;
	employmentId: string;
	startsOn?: string;
	endsOn?: string | null;
	effectiveOn?: string;
	expectedVersion: number;
}): Promise<ActionResult<{ employment: Employment }>> {
	return await runOperatorPermissionAction({
		path: "terminateEmploymentAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not terminate employment.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(amendEmploymentLifecycleActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid employment termination.",
					parsed.details,
				);
			}
			const result = await terminateEmployment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { employment: mapped.data } };
		},
	});
}

export async function correctEmploymentAction(input: {
	correlationId?: string;
	employmentId: string;
	status?: "active" | "notice" | "terminated";
	startsOn?: string;
	endsOn?: string | null;
	reason: string;
	evidenceReference?: string;
	effectiveOn?: string;
	expectedVersion: number;
}): Promise<ActionResult<{ employment: Employment }>> {
	return await runOperatorPermissionAction({
		path: "correctEmploymentAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not correct employment.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(correctEmploymentActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid employment correction.",
					parsed.details,
				);
			}
			const result = await correctEmployment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { employment: mapped.data } };
		},
	});
}

export async function createEmploymentContractAction(input: {
	correlationId?: string;
	employmentId: string;
	referenceCode: string;
	startsOn: string;
	endsOn?: string | null;
	reasonCode: string;
	sourceReference?: string;
}): Promise<ActionResult<{ contract: EmploymentContract }>> {
	return await runOperatorPermissionAction({
		path: "createEmploymentContractAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not create employment contract.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createEmploymentContractActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid employment contract.",
					parsed.details,
				);
			}
			const result = await createEmploymentContract(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { contract: mapped.data } };
		},
	});
}

export async function amendEmploymentContractAction(input: {
	correlationId?: string;
	employmentContractId: string;
	referenceCode?: string;
	startsOn?: string;
	endsOn?: string | null;
	reasonCode: string;
	sourceReference: string;
	expectedVersion: number;
}): Promise<ActionResult<{ contract: EmploymentContract }>> {
	return await runOperatorPermissionAction({
		path: "amendEmploymentContractAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not amend employment contract.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(correctEmploymentContractActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid employment contract amend.",
					parsed.details,
				);
			}
			const result = await amendEmploymentContract(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { contract: mapped.data } };
		},
	});
}

export async function renewEmploymentContractAction(input: {
	correlationId?: string;
	employmentContractId: string;
	referenceCode?: string;
	startsOn: string;
	endsOn?: string | null;
	reasonCode: string;
	sourceReference: string;
	expectedVersion: number;
}): Promise<
	ActionResult<{
		superseded: EmploymentContract;
		successor: EmploymentContract;
	}>
> {
	return await runOperatorPermissionAction({
		path: "renewEmploymentContractAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not renew employment contract.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				supersedeEmploymentContractActionSchema,
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid employment contract renewal.",
					parsed.details,
				);
			}
			const result = await renewEmploymentContract(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return {
				ok: true,
				data: {
					superseded: mapped.data.superseded,
					successor: mapped.data.successor,
				},
			};
		},
	});
}

export async function supersedeEmploymentContractAction(input: {
	correlationId?: string;
	employmentContractId: string;
	referenceCode?: string;
	startsOn: string;
	endsOn?: string | null;
	reasonCode: string;
	sourceReference: string;
	expectedVersion: number;
}): Promise<
	ActionResult<{
		superseded: EmploymentContract;
		successor: EmploymentContract;
	}>
> {
	return await runOperatorPermissionAction({
		path: "supersedeEmploymentContractAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not supersede employment contract.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				supersedeEmploymentContractActionSchema,
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid employment contract supersede.",
					parsed.details,
				);
			}
			const result = await supersedeEmploymentContract(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return {
				ok: true,
				data: {
					superseded: mapped.data.superseded,
					successor: mapped.data.successor,
				},
			};
		},
	});
}

export async function endEmploymentContractAction(input: {
	correlationId?: string;
	employmentContractId: string;
	endsOn: string;
	reasonCode: string;
	sourceReference: string;
	expectedVersion: number;
}): Promise<ActionResult<{ contract: EmploymentContract }>> {
	return await runOperatorPermissionAction({
		path: "endEmploymentContractAction",
		permission: "human-resources.employment.manage",
		safeMessage: "Could not end employment contract.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(endEmploymentContractActionSchema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid employment contract end request.",
					parsed.details,
				);
			}
			const result = await endEmploymentContract(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { contract: mapped.data } };
		},
	});
}

export async function getEmploymentAction(input: {
	correlationId?: string;
	employmentId: string;
}): Promise<ActionResult<{ employment: Employment }>> {
	return await runOperatorPermissionAction({
		path: "getEmploymentAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not get employment.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					employmentId: z.string().uuid(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid employment lookup.",
					parsed.details,
				);
			}
			const result = await getEmployment(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { employment: mapped.data } };
		},
	});
}

export async function getEmploymentAsOfAction(input: {
	correlationId?: string;
	employeeId: string;
	asOf: string;
}): Promise<ActionResult<{ employment: Employment | null }>> {
	return await runOperatorPermissionAction({
		path: "getEmploymentAsOfAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not get employment as of date.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					employeeId: z.string().uuid(),
					asOf: isoDateSchema,
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid employment as-of lookup.",
					parsed.details,
				);
			}
			const result = await getEmploymentAsOf(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { employment: mapped.data } };
		},
	});
}

export async function listEmploymentStatusHistoryAction(input: {
	correlationId?: string;
	employmentId: string;
	asOf?: string;
}): Promise<
	ActionResult<{
		history: EmploymentStatusHistory[];
		statusAsOf: {
			status: "active" | "notice" | "terminated";
			startsOn: string;
			endsOn: string | null;
			effectiveOn: string;
		} | null;
	}>
> {
	return await runOperatorPermissionAction({
		path: "listEmploymentStatusHistoryAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not list employment status history.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					employmentId: z.string().uuid(),
					asOf: isoDateSchema.optional(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid employment status history request.",
					parsed.details,
				);
			}
			const result = await listEmploymentStatusHistory(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return {
				ok: true,
				data: {
					history: mapped.data.history,
					statusAsOf: mapped.data.statusAsOf,
				},
			};
		},
	});
}

export async function getEmploymentContractAction(input: {
	correlationId?: string;
	employmentContractId: string;
}): Promise<ActionResult<{ contract: EmploymentContract }>> {
	return await runOperatorPermissionAction({
		path: "getEmploymentContractAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not get employment contract.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					employmentContractId: z.string().uuid(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid employment contract lookup.",
					parsed.details,
				);
			}
			const result = await getEmploymentContract(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { contract: mapped.data } };
		},
	});
}

export async function getEmploymentContractAsOfAction(input: {
	correlationId?: string;
	employmentId: string;
	asOf: string;
}): Promise<ActionResult<{ contract: EmploymentContract | null }>> {
	return await runOperatorPermissionAction({
		path: "getEmploymentContractAsOfAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not get employment contract as of date.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					employmentId: z.string().uuid(),
					asOf: isoDateSchema,
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid employment contract as-of lookup.",
					parsed.details,
				);
			}
			const result = await getEmploymentContractAsOf(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { contract: mapped.data } };
		},
	});
}

export async function getCurrentEmploymentContractAction(input: {
	correlationId?: string;
	employmentId: string;
	asOf: string;
}): Promise<ActionResult<{ contract: EmploymentContract | null }>> {
	return await runOperatorPermissionAction({
		path: "getCurrentEmploymentContractAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not get current employment contract.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					employmentId: z.string().uuid(),
					asOf: isoDateSchema,
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid current employment contract lookup.",
					parsed.details,
				);
			}
			const result = await getCurrentEmploymentContract(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { contract: mapped.data } };
		},
	});
}

export async function listEmploymentContractsAction(input: {
	correlationId?: string;
	employmentId: string;
}): Promise<ActionResult<{ contracts: EmploymentContract[] }>> {
	return await runOperatorPermissionAction({
		path: "listEmploymentContractsAction",
		permission: "human-resources.employee.read",
		safeMessage: "Could not list employment contracts.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(
				mutationContextSchema.extend({
					employmentId: z.string().uuid(),
				}),
				input,
			);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid employment contract list request.",
					parsed.details,
				);
			}
			const result = await listEmploymentContracts(
				withSessionContext(session, correlationId, parsed.data),
				createHumanResourcesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { contracts: mapped.data } };
		},
	});
}
