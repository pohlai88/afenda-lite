import { z } from "zod";

import {
	payrollDeductionRuleIdSchema,
	payrollEarningRuleIdSchema,
	payrollEmployeeAssignmentIdSchema,
	payrollPayGroupIdSchema,
	payrollRecurringDeductionIdSchema,
	payrollRecurringEarningIdSchema,
} from "../brands";
import { isValidEffectiveDateRange } from "../shared/effective-date";
import {
	isoDateSchema,
	payrollActorUserIdSchema,
	payrollDecimalStringSchema,
	payrollEmployeeIdSchema,
	payrollIdempotencyKeySchema,
	payrollMutationContextSchema,
	payrollOrganizationIdSchema,
} from "./common";

export const payrollEmployeeAssignmentStatusSchema = z.enum([
	"active",
	"archived",
]);

export const payrollRecurringLineStatusSchema = z.enum(["active", "archived"]);

export const payrollEmployeeAssignmentRecordSchema = z.object({
	id: payrollEmployeeAssignmentIdSchema,
	organizationId: payrollOrganizationIdSchema,
	employeeId: payrollEmployeeIdSchema,
	payGroupId: payrollPayGroupIdSchema,
	status: payrollEmployeeAssignmentStatusSchema,
	effectiveFrom: isoDateSchema,
	effectiveTo: isoDateSchema.nullable(),
	version: z.number().int().positive(),
	createdBy: payrollActorUserIdSchema,
	updatedBy: payrollActorUserIdSchema,
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export const payrollRecurringEarningRecordSchema = z.object({
	id: payrollRecurringEarningIdSchema,
	organizationId: payrollOrganizationIdSchema,
	employeeId: payrollEmployeeIdSchema,
	assignmentId: payrollEmployeeAssignmentIdSchema,
	earningRuleId: payrollEarningRuleIdSchema,
	amount: payrollDecimalStringSchema,
	currencyCode: z.string().trim().length(3),
	status: payrollRecurringLineStatusSchema,
	effectiveFrom: isoDateSchema,
	effectiveTo: isoDateSchema.nullable(),
	version: z.number().int().positive(),
	createdBy: payrollActorUserIdSchema,
	updatedBy: payrollActorUserIdSchema,
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export const payrollRecurringDeductionRecordSchema = z.object({
	id: payrollRecurringDeductionIdSchema,
	organizationId: payrollOrganizationIdSchema,
	employeeId: payrollEmployeeIdSchema,
	assignmentId: payrollEmployeeAssignmentIdSchema,
	deductionRuleId: payrollDeductionRuleIdSchema,
	amount: payrollDecimalStringSchema,
	currencyCode: z.string().trim().length(3),
	status: payrollRecurringLineStatusSchema,
	effectiveFrom: isoDateSchema,
	effectiveTo: isoDateSchema.nullable(),
	version: z.number().int().positive(),
	createdBy: payrollActorUserIdSchema,
	updatedBy: payrollActorUserIdSchema,
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

const payrollEmployeeAssignmentCreateSchema = payrollMutationContextSchema
	.extend({
		employeeId: payrollEmployeeIdSchema,
		payGroupId: payrollPayGroupIdSchema,
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
		idempotencyKey: payrollIdempotencyKeySchema,
	})
	.strict();

export const createPayrollEmployeeAssignmentInputSchema =
	payrollEmployeeAssignmentCreateSchema.refine(isValidEffectiveDateRange, {
		message: "effectiveTo must be on or after effectiveFrom",
	});

export const getPayrollEmployeeAssignmentInputSchema =
	payrollMutationContextSchema
		.extend({
			assignmentId: payrollEmployeeAssignmentIdSchema,
		})
		.strict();

const payrollRecurringEarningCreateSchema = payrollMutationContextSchema
	.extend({
		employeeId: payrollEmployeeIdSchema,
		assignmentId: payrollEmployeeAssignmentIdSchema,
		earningRuleId: payrollEarningRuleIdSchema,
		amount: payrollDecimalStringSchema,
		currencyCode: z.string().trim().length(3),
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
		idempotencyKey: payrollIdempotencyKeySchema,
	})
	.strict();

export const createPayrollRecurringEarningInputSchema =
	payrollRecurringEarningCreateSchema.refine(isValidEffectiveDateRange, {
		message: "effectiveTo must be on or after effectiveFrom",
	});

const payrollRecurringDeductionCreateSchema = payrollMutationContextSchema
	.extend({
		employeeId: payrollEmployeeIdSchema,
		assignmentId: payrollEmployeeAssignmentIdSchema,
		deductionRuleId: payrollDeductionRuleIdSchema,
		amount: payrollDecimalStringSchema,
		currencyCode: z.string().trim().length(3),
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
		idempotencyKey: payrollIdempotencyKeySchema,
	})
	.strict();

export const createPayrollRecurringDeductionInputSchema =
	payrollRecurringDeductionCreateSchema.refine(isValidEffectiveDateRange, {
		message: "effectiveTo must be on or after effectiveFrom",
	});

export const payrollEmployeeAssignmentCreateRecordSchema =
	payrollEmployeeAssignmentCreateSchema
		.extend({
			createRequestFingerprint: z.string().trim().min(1),
			createdBy: payrollActorUserIdSchema,
		})
		.strict()
		.refine(isValidEffectiveDateRange, {
			message: "effectiveTo must be on or after effectiveFrom",
		});

export const payrollRecurringEarningCreateRecordSchema =
	payrollRecurringEarningCreateSchema
		.extend({
			createRequestFingerprint: z.string().trim().min(1),
			createdBy: payrollActorUserIdSchema,
		})
		.strict()
		.refine(isValidEffectiveDateRange, {
			message: "effectiveTo must be on or after effectiveFrom",
		});

export const payrollRecurringDeductionCreateRecordSchema =
	payrollRecurringDeductionCreateSchema
		.extend({
			createRequestFingerprint: z.string().trim().min(1),
			createdBy: payrollActorUserIdSchema,
		})
		.strict()
		.refine(isValidEffectiveDateRange, {
			message: "effectiveTo must be on or after effectiveFrom",
		});
