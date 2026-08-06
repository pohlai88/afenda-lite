"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import {
	createPayrollEmployeeAssignment,
	createPayrollRecurringDeduction,
	createPayrollRecurringEarning,
	getPayrollEmployeeAssignment,
} from "@afenda/payroll";
import { z } from "zod";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { createPayrollCommandOptions } from "@/lib/erp/payroll-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

const uuidSchema = z.string().uuid();
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const idempotencyKeySchema = z.string().trim().min(1).max(128);
const employeeIdSchema = z.string().trim().min(1).max(128);
const decimalStringSchema = z.string().regex(/^-?\d+(\.\d+)?$/);

const createAssignmentSchema = z
	.object({
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
		employeeId: employeeIdSchema,
		idempotencyKey: idempotencyKeySchema,
		payGroupId: uuidSchema,
	})
	.strict();

const getAssignmentSchema = z
	.object({
		assignmentId: uuidSchema,
	})
	.strict();

const createRecurringEarningSchema = z
	.object({
		amount: decimalStringSchema,
		assignmentId: uuidSchema,
		currencyCode: z.string().trim().length(3),
		earningRuleId: uuidSchema,
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
		employeeId: employeeIdSchema,
		idempotencyKey: idempotencyKeySchema,
	})
	.strict();

const createRecurringDeductionSchema = z
	.object({
		amount: decimalStringSchema,
		assignmentId: uuidSchema,
		currencyCode: z.string().trim().length(3),
		deductionRuleId: uuidSchema,
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
		employeeId: employeeIdSchema,
		idempotencyKey: idempotencyKeySchema,
	})
	.strict();

export async function createPayrollEmployeeAssignmentAction(input: {
	effectiveFrom: string;
	effectiveTo?: string | null;
	employeeId: string;
	idempotencyKey: string;
	payGroupId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "createPayrollEmployeeAssignmentAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not create the payroll employee assignment.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createAssignmentSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payroll employee assignment.",
				});
			}
			return mapPackageResult(
				await createPayrollEmployeeAssignment(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						effectiveFrom: parsed.data.effectiveFrom,
						...(parsed.data.effectiveTo === undefined
							? {}
							: { effectiveTo: parsed.data.effectiveTo }),
						employeeId: parsed.data.employeeId,
						idempotencyKey: parsed.data.idempotencyKey,
						payGroupId: parsed.data.payGroupId,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function getPayrollEmployeeAssignmentAction(input: {
	assignmentId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "getPayrollEmployeeAssignmentAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not read the payroll employee assignment.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getAssignmentSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid assignment lookup.",
				});
			}
			return mapPackageResult(
				await getPayrollEmployeeAssignment(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						assignmentId: parsed.data.assignmentId,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function createPayrollRecurringEarningAction(input: {
	amount: string;
	assignmentId: string;
	currencyCode: string;
	earningRuleId: string;
	effectiveFrom: string;
	effectiveTo?: string | null;
	employeeId: string;
	idempotencyKey: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "createPayrollRecurringEarningAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not create the recurring earning.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createRecurringEarningSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid recurring earning.",
				});
			}
			return mapPackageResult(
				await createPayrollRecurringEarning(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						amount: parsed.data.amount,
						assignmentId: parsed.data.assignmentId,
						currencyCode: parsed.data.currencyCode,
						earningRuleId: parsed.data.earningRuleId,
						effectiveFrom: parsed.data.effectiveFrom,
						...(parsed.data.effectiveTo === undefined
							? {}
							: { effectiveTo: parsed.data.effectiveTo }),
						employeeId: parsed.data.employeeId,
						idempotencyKey: parsed.data.idempotencyKey,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function createPayrollRecurringDeductionAction(input: {
	amount: string;
	assignmentId: string;
	currencyCode: string;
	deductionRuleId: string;
	effectiveFrom: string;
	effectiveTo?: string | null;
	employeeId: string;
	idempotencyKey: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "createPayrollRecurringDeductionAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not create the recurring deduction.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createRecurringDeductionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid recurring deduction.",
				});
			}
			return mapPackageResult(
				await createPayrollRecurringDeduction(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						amount: parsed.data.amount,
						assignmentId: parsed.data.assignmentId,
						currencyCode: parsed.data.currencyCode,
						deductionRuleId: parsed.data.deductionRuleId,
						effectiveFrom: parsed.data.effectiveFrom,
						...(parsed.data.effectiveTo === undefined
							? {}
							: { effectiveTo: parsed.data.effectiveTo }),
						employeeId: parsed.data.employeeId,
						idempotencyKey: parsed.data.idempotencyKey,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}
