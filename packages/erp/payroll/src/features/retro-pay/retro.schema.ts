import { z } from "zod";

import {
	payrollPeriodIdSchema,
	payrollRunIdSchema,
} from "../../kernel/identity/brands";
import {
	payrollDecimalStringSchema,
	payrollEmployeeIdSchema,
	payrollIdempotencyKeySchema,
	payrollMutationContextSchema,
} from "../../kernel/validation/common.schema";
import { PAYROLL_RETRO_STATUSES } from "./contract";

export const payrollRetroStatusSchema = z.enum(PAYROLL_RETRO_STATUSES);

export const payrollRetroCorrectionSchema = z.discriminatedUnion("kind", [
	z
		.object({
			amount: payrollDecimalStringSchema,
			kind: z.literal("base_compensation"),
		})
		.strict(),
	z
		.object({
			amount: payrollDecimalStringSchema,
			currencyCode: z.string().trim().length(3),
			earningRuleCode: z.string().trim().min(1).max(64),
			earningRuleId: z.string().trim().min(1).max(128),
			earningRuleVersion: z.string().trim().min(1).max(64),
			kind: z.literal("variable_input"),
			sourceId: z.string().trim().min(1).max(128),
			sourceType: z.string().trim().min(1).max(64),
		})
		.strict(),
]);

export const payrollRetroLineKindSchema = z.enum([
	"earning",
	"pre_tax_deduction",
	"employee_statutory",
	"post_tax_deduction",
	"employer_contribution",
]);

export const payrollRetroRuleKindSchema = z.enum([
	"earning",
	"deduction",
	"statutory",
	"none",
]);

export const payrollRetroDifferenceSchema = z
	.object({
		calculationVersion: z.string().trim().min(1).max(64),
		correctedSnapshotHash: z.string().trim().min(1).max(256),
		currencyCode: z.string().trim().length(3),
		lines: z.array(
			z
				.object({
					amount: payrollDecimalStringSchema,
					code: z.string().trim().min(1).max(64),
					currencyCode: z.string().trim().length(3),
					lineKind: payrollRetroLineKindSchema,
					ruleCode: z.string().trim().min(1).max(64),
					ruleKind: payrollRetroRuleKindSchema,
					ruleVersion: z.string().trim().min(1).max(64),
				})
				.strict(),
		),
		sealedSnapshotHash: z.string().trim().min(1).max(256),
		totals: z
			.object({
				employeeDeductions: payrollDecimalStringSchema,
				employeeStatutory: payrollDecimalStringSchema,
				employerCost: payrollDecimalStringSchema,
				gross: payrollDecimalStringSchema,
				net: payrollDecimalStringSchema,
			})
			.strict(),
	})
	.strict();

export const queueRetroItemInputSchema = payrollMutationContextSchema
	.extend({
		correction: payrollRetroCorrectionSchema,
		employeeId: payrollEmployeeIdSchema,
		idempotencyKey: payrollIdempotencyKeySchema,
		originPeriodId: payrollPeriodIdSchema,
		reason: z.string().trim().min(1).max(512),
	})
	.strict();

export const calculateRetroDifferenceInputSchema = payrollMutationContextSchema
	.extend({
		originRunId: payrollRunIdSchema,
		retroItemId: z.string().uuid(),
	})
	.strict();

export const applyRetroToPeriodInputSchema = payrollMutationContextSchema
	.extend({
		retroItemId: z.string().uuid(),
		targetPeriodId: payrollPeriodIdSchema,
		targetRunId: payrollRunIdSchema,
	})
	.strict();

export const listRetroItemsInputSchema = payrollMutationContextSchema
	.pick({ organizationId: true, actorUserId: true })
	.extend({
		employeeId: payrollEmployeeIdSchema.optional(),
		originPeriodId: payrollPeriodIdSchema.optional(),
		status: payrollRetroStatusSchema.optional(),
		targetRunId: payrollRunIdSchema.optional(),
	})
	.strict();
