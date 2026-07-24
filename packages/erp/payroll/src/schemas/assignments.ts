import { z } from "zod";

import {
	payrollDeductionRuleIdSchema,
	payrollEarningRuleIdSchema,
	payrollEmployeeAssignmentIdSchema,
	payrollPayGroupIdSchema,
	payrollRecurringDeductionIdSchema,
	payrollRecurringEarningIdSchema,
} from "../brands";
import {
	isoDateSchema,
	payrollActorUserIdSchema,
	payrollCorrelationIdSchema,
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

export const createPayrollEmployeeAssignmentInputSchema =
	payrollMutationContextSchema
		.extend({
			employeeId: payrollEmployeeIdSchema,
			payGroupId: payrollPayGroupIdSchema,
			effectiveFrom: isoDateSchema,
			effectiveTo: isoDateSchema.nullable().optional(),
			idempotencyKey: payrollIdempotencyKeySchema,
		})
		.strict();

export const getPayrollEmployeeAssignmentInputSchema =
	payrollMutationContextSchema
		.extend({
			assignmentId: payrollEmployeeAssignmentIdSchema,
		})
		.strict();

export const createPayrollRecurringEarningInputSchema =
	payrollMutationContextSchema
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

export const createPayrollRecurringDeductionInputSchema =
	payrollMutationContextSchema
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

export const payrollEmployeeAssignmentCreateRecordSchema =
	createPayrollEmployeeAssignmentInputSchema
		.extend({
			createRequestFingerprint: z.string().trim().min(1),
			createdBy: payrollActorUserIdSchema,
		})
		.strict();

export const payrollRecurringEarningCreateRecordSchema =
	createPayrollRecurringEarningInputSchema
		.extend({
			createRequestFingerprint: z.string().trim().min(1),
			createdBy: payrollActorUserIdSchema,
		})
		.strict();

export const payrollRecurringDeductionCreateRecordSchema =
	createPayrollRecurringDeductionInputSchema
		.extend({
			createRequestFingerprint: z.string().trim().min(1),
			createdBy: payrollActorUserIdSchema,
		})
		.strict();
