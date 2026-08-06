import {
	handoffPriorEmployerYtdSchema,
	handoffStatutoryProfileSchema,
} from "@afenda/events/schemas";
import { z } from "zod";

import {
	payrollPayGroupIdSchema,
	payrollPeriodIdSchema,
	payrollRunIdSchema,
} from "../../kernel/identity/brands";
import { payrollRoundingPolicySchema } from "../../kernel/money/rounding-policy";
import {
	isoDateSchema,
	payrollActorUserIdSchema,
	payrollDecimalStringSchema,
	payrollEmployeeIdSchema,
	payrollExpectedVersionSchema,
	payrollIdempotencyKeySchema,
	payrollMutationContextSchema,
	payrollOrganizationIdSchema,
} from "../../kernel/validation/common.schema";
import {
	PAYROLL_FINAL_SETTLEMENT_LINE_KINDS,
	PAYROLL_FINAL_SETTLEMENT_STATEMENT_CONTRACT_VERSION,
	PAYROLL_FINAL_SETTLEMENT_STATUSES,
	PAYROLL_FINAL_SETTLEMENT_TERMINAL_STATUSES,
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
		leaveBalanceDays: payrollDecimalStringSchema,
		noticeInLieuAmount: payrollDecimalStringSchema,
		noticePayAmount: payrollDecimalStringSchema,
		recoveries: z.array(payrollFinalSettlementRecoverySchema).max(32),
	})
	.strict();

const settlementCompensationSnapshotShape = {
	baseCompensation: payrollDecimalStringSchema,
	currencyCode: z.string().trim().length(3),
	decimalScale: z.number().int().min(0).max(4),
	effectiveDate: isoDateSchema,
	employeeId: payrollEmployeeIdSchema,
	employmentId: z.string().trim().min(1).max(128),
	employmentStatus: z.enum(PAYROLL_FINAL_SETTLEMENT_TERMINAL_STATUSES),
	payFrequency: z.string().trim().min(1).max(32),
	roundingMode: z.string().trim().min(1).max(32),
	priorEmployerYtd: z.array(handoffPriorEmployerYtdSchema).max(16),
	roundingPolicy: payrollRoundingPolicySchema,
	sourceVersion: z
		.object({
			compensationVersion: z.number().int().positive().optional(),
			leavePolicyVersion: z.number().int().positive().optional(),
			statutoryProfileVersion: z.number().int().positive().optional(),
			timesheetVersion: z.number().int().positive().optional(),
		})
		.strict(),
	statutoryProfile: handoffStatutoryProfileSchema.nullable(),
} as const;

const settlementYearToDateShape = {
	currencyCode: z.string().trim().length(3),
	employeeStatutory: payrollDecimalStringSchema,
	employerStatutory: payrollDecimalStringSchema,
	gross: payrollDecimalStringSchema,
	taxYear: z.number().int().min(1900).max(9999),
	taxableBase: payrollDecimalStringSchema,
} as const;

/**
 * Construction shape. A settlement sealed from now on MUST carry the distinct
 * `taxWithheld` channel; the year-to-date capability always produces it.
 */
export const payrollFinalSettlementCompensationSnapshotSchema = z
	.object({
		...settlementCompensationSnapshotShape,
		yearToDate: z
			.object({
				...settlementYearToDateShape,
				taxWithheld: payrollDecimalStringSchema,
			})
			.strict(),
	})
	.strict();

/**
 * RE-ADMISSION shape, for loading an already-sealed row.
 *
 * `taxWithheld` split out of the commingled `employeeStatutory` after the first
 * settlements could have been sealed, and a `.strict()` required field would
 * make every pre-split row unreadable. On re-admission only, an absent
 * `taxWithheld` re-admits as "0" — the honest reading of a row written before
 * the channel existed, where any tax withheld is still sitting inside
 * `employeeStatutory` and there is no way to separate it after the fact.
 * Construction is unchanged: nothing new can be sealed without the field.
 *
 * As of this commit no such row exists anywhere — migration `0053` is unapplied,
 * so the settlement table holds no production data and the compatibility is
 * theoretical. `compensationSnapshotHash` is fingerprinted once at initiate and
 * thereafter only carried, never recomputed from the re-admitted value, so a
 * defaulted field cannot drift a stored hash: the hash always describes the
 * shape as stored.
 */
export const payrollFinalSettlementCompensationSnapshotReadSchema = z
	.object({
		...settlementCompensationSnapshotShape,
		yearToDate: z
			.object({
				...settlementYearToDateShape,
				taxWithheld: payrollDecimalStringSchema.default("0"),
			})
			.strict(),
	})
	.strict();

export const payrollFinalSettlementStatutoryEvidenceEntrySchema = z
	.object({
		baseAmount: payrollDecimalStringSchema,
		calculatorId: z.string().trim().min(1).max(128),
		employeeAmount: payrollDecimalStringSchema,
		employerAmount: payrollDecimalStringSchema,
		jurisdictionCode: z.string().trim().min(1).max(32),
		ruleCode: z.string().trim().min(1).max(64),
		ruleVersion: z.string().trim().min(1).max(64),
	})
	.strict();

export const payrollFinalSettlementStatutoryEvidenceSchema = z.array(
	payrollFinalSettlementStatutoryEvidenceEntrySchema,
);

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
		contractVersion: z.literal(
			PAYROLL_FINAL_SETTLEMENT_STATEMENT_CONTRACT_VERSION,
		),
		currencyCode: z.string().trim().length(3),
		employeeId: payrollEmployeeIdSchema,
		lines: z.array(
			z
				.object({
					amount: payrollDecimalStringSchema,
					category: payrollFinalSettlementLineKindSchema,
					code: z.string().trim().min(1).max(64),
					currencyCode: z.string().trim().length(3),
					sequence: z.number().int().positive(),
				})
				.strict(),
		),
		organizationId: payrollOrganizationIdSchema,
		periodId: payrollPeriodIdSchema,
		settlementId: z.string().uuid(),
		status: payrollFinalSettlementStatusSchema,
		terminationEffectiveOn: isoDateSchema,
		terminationId: z.string().trim().min(1).max(128),
		totals: payrollFinalSettlementTotalsSchema,
	})
	.strict();

/**
 * Initiate carries only non-statutory facts. Compensation is pinned from the
 * accepted handoff (never supplied), and statutory treatment is resolved by
 * the fail-closed calculator seam at calculate time.
 */
export const initiateFinalSettlementInputSchema = payrollMutationContextSchema
	.extend({
		employeeId: payrollEmployeeIdSchema,
		idempotencyKey: payrollIdempotencyKeySchema,
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

/** Subject read: the actor may only read their own settlement statement. */
export const getOwnFinalSettlementStatementInputSchema = z
	.object({
		actorUserId: payrollActorUserIdSchema,
		organizationId: payrollOrganizationIdSchema,
		settlementId: z.string().uuid(),
	})
	.strict();

/** Administrative read: any subject's settlement statement. */
export const getFinalSettlementStatementInputSchema = z
	.object({
		actorUserId: payrollActorUserIdSchema,
		organizationId: payrollOrganizationIdSchema,
		settlementId: z.string().uuid(),
	})
	.strict();
