import { z } from "zod";

import {
	payrollPayGroupIdSchema,
	payrollPeriodIdSchema,
	payrollRunIdSchema,
} from "../../kernel/identity/brands";
import {
	isoDateSchema,
	payrollDecimalStringSchema,
	payrollEmployeeIdSchema,
	payrollExpectedVersionSchema,
	payrollIdempotencyKeySchema,
	payrollMutationContextSchema,
} from "../../kernel/validation/common.schema";
import {
	PAYROLL_FINAL_SETTLEMENT_LINE_KINDS,
	PAYROLL_FINAL_SETTLEMENT_STATUSES,
} from "./contract";

export const payrollFinalSettlementStatusSchema = z.enum(
	PAYROLL_FINAL_SETTLEMENT_STATUSES,
);

export const payrollFinalSettlementLineKindSchema = z.enum(
	PAYROLL_FINAL_SETTLEMENT_LINE_KINDS,
);

export const payrollFinalSettlementRecoverySchema = z
	.object({
		amount: payrollDecimalStringSchema,
		code: z.string().trim().min(1).max(64),
		reason: z.string().trim().min(1).max(512),
	})
	.strict();

export const payrollFinalSettlementFactsSchema = z
	.object({
		baseCompensation: payrollDecimalStringSchema,
		currencyCode: z.string().trim().length(3),
		employeeStatutoryAmount: payrollDecimalStringSchema,
		employerStatutoryAmount: payrollDecimalStringSchema,
		leaveBalanceDays: payrollDecimalStringSchema,
		noticeInLieuAmount: payrollDecimalStringSchema,
		noticePayAmount: payrollDecimalStringSchema,
		recoveries: z.array(payrollFinalSettlementRecoverySchema).max(32),
	})
	.strict();

export const payrollFinalSettlementTotalsSchema = z
	.object({
		employeeStatutory: payrollDecimalStringSchema,
		employerStatutory: payrollDecimalStringSchema,
		gross: payrollDecimalStringSchema,
		net: payrollDecimalStringSchema,
		recoveries: payrollDecimalStringSchema,
	})
	.strict();

export const payrollFinalSettlementLineSchema = z
	.object({
		amount: payrollDecimalStringSchema,
		code: z.string().trim().min(1).max(64),
		createdAt: z.coerce.date(),
		currencyCode: z.string().trim().length(3),
		id: z.string().uuid(),
		kind: payrollFinalSettlementLineKindSchema,
		organizationId: z.string().trim().min(1),
		sequence: z.number().int().positive(),
		settlementId: z.string().uuid(),
	})
	.strict();

export const payrollFinalSettlementStatementSchema = z
	.object({
		contentHash: z.string().trim().min(1).max(256),
		currencyCode: z.string().trim().length(3),
		employeeId: payrollEmployeeIdSchema,
		issuedAt: z.coerce.date(),
		issuedBy: z.string().trim().min(1),
		lines: z.array(payrollFinalSettlementLineSchema),
		periodId: payrollPeriodIdSchema,
		settlementId: z.string().uuid(),
		terminationEffectiveOn: isoDateSchema,
		terminationId: z.string().trim().min(1).max(128),
		totals: payrollFinalSettlementTotalsSchema,
	})
	.strict();

export const initiateFinalSettlementInputSchema = payrollMutationContextSchema
	.extend({
		baseCompensation: payrollDecimalStringSchema,
		currencyCode: z.string().trim().length(3),
		employeeId: payrollEmployeeIdSchema,
		employeeStatutoryAmount: payrollDecimalStringSchema.optional(),
		employerStatutoryAmount: payrollDecimalStringSchema.optional(),
		idempotencyKey: payrollIdempotencyKeySchema,
		leaveBalanceDays: payrollDecimalStringSchema,
		noticeInLieuAmount: payrollDecimalStringSchema.optional(),
		noticePayAmount: payrollDecimalStringSchema.optional(),
		originRunId: payrollRunIdSchema.optional(),
		payGroupId: payrollPayGroupIdSchema,
		periodId: payrollPeriodIdSchema,
		recoveries: z
			.array(payrollFinalSettlementRecoverySchema)
			.max(32)
			.optional(),
		terminationEffectiveOn: isoDateSchema,
		terminationId: z.string().trim().min(1).max(128),
	})
	.strict();

export const calculateFinalSettlementInputSchema = payrollMutationContextSchema
	.extend({
		clearanceReason: z.string().trim().min(1).max(512).optional(),
		expectedVersion: payrollExpectedVersionSchema,
		settlementId: z.string().uuid(),
	})
	.strict();

export const finalizeFinalSettlementInputSchema = payrollMutationContextSchema
	.extend({
		expectedVersion: payrollExpectedVersionSchema,
		settlementId: z.string().uuid(),
	})
	.strict();

export const issueFinalSettlementStatementInputSchema =
	payrollMutationContextSchema
		.extend({
			expectedVersion: payrollExpectedVersionSchema,
			settlementId: z.string().uuid(),
		})
		.strict();
