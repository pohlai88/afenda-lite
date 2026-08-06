"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import {
	createPayrollVariableInput,
	getPayrollVariableInput,
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

const createSchema = z
	.object({
		amount: decimalStringSchema,
		currencyCode: z.string().trim().length(3),
		earningRuleId: uuidSchema,
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
		employeeId: employeeIdSchema,
		idempotencyKey: idempotencyKeySchema,
		payGroupId: uuidSchema,
		periodId: uuidSchema,
		sourceId: z.string().trim().min(1).max(128),
		sourceType: z.string().trim().min(1).max(64),
	})
	.strict();

const getSchema = z
	.object({
		variableInputId: uuidSchema,
	})
	.strict();

export async function createPayrollVariableInputAction(input: {
	amount: string;
	currencyCode: string;
	earningRuleId: string;
	effectiveFrom: string;
	effectiveTo?: string | null;
	employeeId: string;
	idempotencyKey: string;
	payGroupId: string;
	periodId: string;
	sourceId: string;
	sourceType: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "createPayrollVariableInputAction",
		permission: "payroll.input.manage",
		safeMessage: "Could not create the payroll variable input.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payroll variable input.",
				});
			}
			return mapPackageResult(
				await createPayrollVariableInput(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						amount: parsed.data.amount,
						currencyCode: parsed.data.currencyCode,
						earningRuleId: parsed.data.earningRuleId,
						effectiveFrom: parsed.data.effectiveFrom,
						...(parsed.data.effectiveTo === undefined
							? {}
							: { effectiveTo: parsed.data.effectiveTo }),
						employeeId: parsed.data.employeeId,
						idempotencyKey: parsed.data.idempotencyKey,
						payGroupId: parsed.data.payGroupId,
						periodId: parsed.data.periodId,
						sourceId: parsed.data.sourceId,
						sourceType: parsed.data.sourceType,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function getPayrollVariableInputAction(input: {
	variableInputId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "getPayrollVariableInputAction",
		permission: "payroll.input.manage",
		safeMessage: "Could not read the payroll variable input.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid variable-input lookup.",
				});
			}
			return mapPackageResult(
				await getPayrollVariableInput(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						variableInputId: parsed.data.variableInputId,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}
