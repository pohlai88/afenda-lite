import { z } from "zod";

import {
	payrollEarningRuleIdSchema,
	payrollPayGroupIdSchema,
	payrollPeriodIdSchema,
	payrollVariableInputIdSchema,
} from "../../kernel/identity/brands";
import { isValidEffectiveDateRange } from "../../kernel/temporal/effective-date";
import {
	isoDateSchema,
	payrollActorUserIdSchema,
	payrollDecimalStringSchema,
	payrollEmployeeIdSchema,
	payrollIdempotencyKeySchema,
	payrollMutationContextSchema,
	payrollOrganizationIdSchema,
} from "../../kernel/validation/common.schema";

export const payrollVariableInputStatusSchema = z.enum([
	"accepted",
	"superseded",
	"cancelled",
]);

export const payrollVariableInputRecordSchema = z.object({
	id: payrollVariableInputIdSchema,
	organizationId: payrollOrganizationIdSchema,
	employeeId: payrollEmployeeIdSchema,
	payGroupId: payrollPayGroupIdSchema,
	periodId: payrollPeriodIdSchema,
	earningRuleId: payrollEarningRuleIdSchema,
	earningRuleCode: z.string().trim().min(1).max(64),
	earningRuleVersion: z.string().trim().min(1).max(64),
	amount: payrollDecimalStringSchema,
	currencyCode: z.string().trim().length(3),
	sourceType: z.string().trim().min(1).max(64),
	sourceId: z.string().trim().min(1).max(128),
	status: payrollVariableInputStatusSchema,
	effectiveFrom: isoDateSchema,
	effectiveTo: isoDateSchema.nullable(),
	version: z.number().int().positive(),
	createdBy: payrollActorUserIdSchema,
	updatedBy: payrollActorUserIdSchema,
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

const payrollVariableInputCreateSchema = payrollMutationContextSchema
	.extend({
		employeeId: payrollEmployeeIdSchema,
		payGroupId: payrollPayGroupIdSchema,
		periodId: payrollPeriodIdSchema,
		earningRuleId: payrollEarningRuleIdSchema,
		amount: payrollDecimalStringSchema,
		currencyCode: z.string().trim().length(3),
		sourceType: z.string().trim().min(1).max(64),
		sourceId: z.string().trim().min(1).max(128),
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
		idempotencyKey: payrollIdempotencyKeySchema,
	})
	.strict();

export const createPayrollVariableInputInputSchema =
	payrollVariableInputCreateSchema.refine(isValidEffectiveDateRange, {
		message: "effectiveTo must be on or after effectiveFrom",
	});

export const getPayrollVariableInputInputSchema = payrollMutationContextSchema
	.extend({
		variableInputId: payrollVariableInputIdSchema,
	})
	.strict();

export const payrollVariableInputCreateRecordSchema =
	payrollVariableInputCreateSchema
		.extend({
			earningRuleCode: z.string().trim().min(1).max(64),
			earningRuleVersion: z.string().trim().min(1).max(64),
			sourceRequestFingerprint: z.string().trim().min(1),
			createRequestFingerprint: z.string().trim().min(1),
			createdBy: payrollActorUserIdSchema,
		})
		.strict()
		.refine(isValidEffectiveDateRange, {
			message: "effectiveTo must be on or after effectiveFrom",
		});

export const idempotentPayrollVariableInputRecordSchema = z.object({
	variableInput: payrollVariableInputRecordSchema,
	sourceRequestFingerprint: z.string().trim().min(1),
	createRequestFingerprint: z.string().trim().min(1),
});
