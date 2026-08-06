import { z } from "zod";

const payrollEntityPayloadBase = z
	.object({
		organizationId: z.string().trim().min(1),
		entityType: z.string().trim().min(1),
		entityId: z.string().trim().min(1),
		actorId: z.string().trim().min(1),
		correlationId: z.string().trim().min(1),
		causationId: z.string().trim().min(1).optional(),
	})
	.strict();

export const payrollEntityPayloadSchema = payrollEntityPayloadBase;

export type PayrollEntityPayload = z.infer<typeof payrollEntityPayloadSchema>;

const payrollAmountSchema = z
	.string()
	.trim()
	.regex(/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/);
const payrollCurrencySchema = z.string().trim().length(3);

/** Bounded cross-module vocabulary; detailed reversal text remains Payroll-private. */
export const payrollReversalReasonCodeSchema = z.enum([
	"calculation_correction",
	"employee_data_correction",
	"statutory_correction",
	"payment_correction",
	"accounting_correction",
	"operational_correction",
]);
export type PayrollReversalReasonCode = z.infer<
	typeof payrollReversalReasonCodeSchema
>;

const payrollFinalizationBase = payrollEntityPayloadBase.extend({
	entityType: z.literal("payroll_run"),
	payGroupId: z.string().uuid(),
	periodId: z.string().uuid(),
	calculationSnapshotHash: z.string().trim().min(1).max(256),
	calculationVersion: z.string().trim().min(1).max(64),
});

export const payrollRunFinalizedPayloadSchema = payrollFinalizationBase.extend({
	totals: z.array(
		z
			.object({
				currencyCode: payrollCurrencySchema,
				gross: payrollAmountSchema,
				employeeDeductions: payrollAmountSchema,
				employeeStatutory: payrollAmountSchema,
				employerCost: payrollAmountSchema,
				net: payrollAmountSchema,
			})
			.strict(),
	),
});

export const payrollPaymentRequestedPayloadSchema =
	payrollFinalizationBase.extend({
		paymentDate: z.string().date(),
		payments: z.array(
			z
				.object({
					employeeId: z.string().trim().min(1),
					sourceId: z.string().uuid(),
					amount: payrollAmountSchema,
					currencyCode: payrollCurrencySchema,
				})
				.strict(),
		),
	});

export const payrollPostingRequestedPayloadSchema =
	payrollFinalizationBase.extend({
		postingDate: z.string().date(),
		lines: z.array(
			z
				.object({
					sourceId: z.string().uuid(),
					employeeId: z.string().trim().min(1),
					category: z.enum([
						"earning",
						"pre_tax_deduction",
						"employee_statutory",
						"post_tax_deduction",
						"employer_contribution",
					]),
					amount: payrollAmountSchema,
					currencyCode: payrollCurrencySchema,
					dimensions: z.record(z.string(), z.string()),
				})
				.strict(),
		),
	});

const payrollCorrectionBase = payrollFinalizationBase.extend({
	originalRunId: z.string().uuid(),
	reasonCode: payrollReversalReasonCodeSchema,
});

export const payrollPaymentCorrectionRequestedPayloadSchema =
	payrollCorrectionBase.extend({
		paymentDate: z.string().date(),
		payments: z.array(
			z
				.object({
					employeeId: z.string().trim().min(1),
					sourceId: z.string().uuid(),
					amount: payrollAmountSchema.refine(
						(amount) => amount === "0" || amount.startsWith("-"),
					),
					currencyCode: payrollCurrencySchema,
				})
				.strict(),
		),
	});

export const payrollPostingCorrectionRequestedPayloadSchema =
	payrollCorrectionBase.extend({
		postingDate: z.string().date(),
		lines: z.array(
			z
				.object({
					sourceId: z.string().uuid(),
					employeeId: z.string().trim().min(1),
					category: z.enum([
						"earning",
						"pre_tax_deduction",
						"employee_statutory",
						"post_tax_deduction",
						"employer_contribution",
					]),
					amount: payrollAmountSchema.refine(
						(amount) => amount === "0" || amount.startsWith("-"),
					),
					currencyCode: payrollCurrencySchema,
					dimensions: z.record(z.string(), z.string()),
				})
				.strict(),
		),
	});

export type PayrollRunFinalizedPayload = z.infer<
	typeof payrollRunFinalizedPayloadSchema
>;
export type PayrollPaymentRequestedPayload = z.infer<
	typeof payrollPaymentRequestedPayloadSchema
>;
export type PayrollPostingRequestedPayload = z.infer<
	typeof payrollPostingRequestedPayloadSchema
>;

export const PAYROLL_RUN_STARTED_EVENT = "payroll.run.started.v1" as const;
export const PAYROLL_RUN_CALCULATED_EVENT =
	"payroll.run.calculated.v1" as const;
export const PAYROLL_RUN_FINALIZED_EVENT = "payroll.run.finalized.v1" as const;
export const PAYROLL_RUN_REVERSED_EVENT = "payroll.run.reversed.v1" as const;
export const PAYROLL_PAYMENT_REQUESTED_EVENT =
	"payroll.payment-requested.v1" as const;
export const PAYROLL_POSTING_REQUESTED_EVENT =
	"payroll.posting-requested.v1" as const;
export const PAYROLL_PAYMENT_CORRECTION_REQUESTED_EVENT =
	"payroll.payment-correction-requested.v1" as const;
export const PAYROLL_POSTING_CORRECTION_REQUESTED_EVENT =
	"payroll.posting-correction-requested.v1" as const;
export const PAYROLL_PAYSLIP_PUBLISHED_EVENT =
	"payroll.payslip.published.v1" as const;
export const PAYROLL_FINAL_SETTLEMENT_INITIATED_EVENT =
	"payroll.final-settlement.initiated.v1" as const;
export const PAYROLL_FINAL_SETTLEMENT_CALCULATED_EVENT =
	"payroll.final-settlement.calculated.v1" as const;
export const PAYROLL_FINAL_SETTLEMENT_FINALIZED_EVENT =
	"payroll.final-settlement.finalized.v1" as const;

export const PayrollEventSchemas = {
	[PAYROLL_RUN_STARTED_EVENT]: payrollEntityPayloadSchema,
	[PAYROLL_RUN_CALCULATED_EVENT]: payrollEntityPayloadSchema,
	[PAYROLL_RUN_FINALIZED_EVENT]: payrollRunFinalizedPayloadSchema,
	[PAYROLL_RUN_REVERSED_EVENT]: payrollEntityPayloadSchema,
	[PAYROLL_PAYMENT_REQUESTED_EVENT]: payrollPaymentRequestedPayloadSchema,
	[PAYROLL_POSTING_REQUESTED_EVENT]: payrollPostingRequestedPayloadSchema,
	[PAYROLL_PAYMENT_CORRECTION_REQUESTED_EVENT]:
		payrollPaymentCorrectionRequestedPayloadSchema,
	[PAYROLL_POSTING_CORRECTION_REQUESTED_EVENT]:
		payrollPostingCorrectionRequestedPayloadSchema,
	[PAYROLL_PAYSLIP_PUBLISHED_EVENT]: payrollEntityPayloadSchema,
	[PAYROLL_FINAL_SETTLEMENT_INITIATED_EVENT]: payrollEntityPayloadSchema,
	[PAYROLL_FINAL_SETTLEMENT_CALCULATED_EVENT]: payrollEntityPayloadSchema,
	[PAYROLL_FINAL_SETTLEMENT_FINALIZED_EVENT]: payrollEntityPayloadSchema,
} as const;

export type PayrollEventType = keyof typeof PayrollEventSchemas;

export const PAYROLL_EVENT_IDS = [
	PAYROLL_RUN_STARTED_EVENT,
	PAYROLL_RUN_CALCULATED_EVENT,
	PAYROLL_RUN_FINALIZED_EVENT,
	PAYROLL_RUN_REVERSED_EVENT,
	PAYROLL_PAYMENT_REQUESTED_EVENT,
	PAYROLL_POSTING_REQUESTED_EVENT,
	PAYROLL_PAYMENT_CORRECTION_REQUESTED_EVENT,
	PAYROLL_POSTING_CORRECTION_REQUESTED_EVENT,
	PAYROLL_PAYSLIP_PUBLISHED_EVENT,
	PAYROLL_FINAL_SETTLEMENT_INITIATED_EVENT,
	PAYROLL_FINAL_SETTLEMENT_CALCULATED_EVENT,
	PAYROLL_FINAL_SETTLEMENT_FINALIZED_EVENT,
] as const satisfies readonly PayrollEventType[];
