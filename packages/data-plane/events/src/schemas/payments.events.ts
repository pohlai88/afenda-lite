import { z } from "zod";

const money = z
	.string()
	.trim()
	.regex(/^\d+(?:\.\d{1,6})?$/);
const signedMoney = z
	.string()
	.trim()
	.regex(/^-?\d+(?:\.\d{1,6})?$/);
const paymentMethodKind = z.enum([
	"cash",
	"check",
	"wire",
	"ach",
	"card",
	"gateway",
	"other",
]);
const methodSnapshotSchema = z
	.object({
		paymentMethodId: z.string().uuid(),
		code: z.string().trim().min(1),
		kind: paymentMethodKind,
	})
	.strict();
const fxBlockSchema = z
	.object({
		transactionCurrency: z.string().trim().length(3),
		functionalCurrency: z.string().trim().length(3),
		exchangeRate: money,
		rateDate: z.string(),
		transactionAmount: money,
		functionalAmount: money,
	})
	.strict();
const deductionFactSchema = z
	.object({
		kind: z.enum([
			"bank_charge",
			"write_off",
			"rounding",
			"withholding",
			"other",
		]),
		effect: z.enum([
			"reduces_application_only",
			"reduces_cash_movement",
			"informational",
		]),
		accountingPurposeCode: z.string().trim().min(1),
		amount: signedMoney,
		functionalAmount: signedMoney.nullable(),
	})
	.strict();
export const paymentPayloadSchema = z
	.object({
		organizationId: z.string().trim().min(1),
		paymentId: z.string().uuid(),
		paymentAccountId: z.string().uuid(),
		paymentMethodId: z.string().uuid(),
		methodSnapshot: methodSnapshotSchema.nullable(),
		instrument: z
			.object({
				kind: z.string().trim().min(1),
				reference: z.string().nullable(),
			})
			.strict()
			.nullable(),
		fx: fxBlockSchema.nullable(),
		functionalAmount: money,
		cashMovement: money,
		deductions: z.array(deductionFactSchema),
		roundingDifferenceFunctionalAmount: signedMoney.nullable(),
		direction: z.enum(["receipt", "disbursement", "refund"]),
		purpose: z.enum([
			"customer_receipt",
			"supplier_disbursement",
			"customer_refund",
			"supplier_refund_receipt",
			"internal_transfer",
			"manual_receipt",
			"manual_disbursement",
		]),
		status: z.enum(["draft", "posted", "reversed"]),
		amount: money,
		currencyCode: z.string().trim().length(3),
		transferGroupId: z.string().uuid().nullable(),
		linkedPaymentId: z.string().uuid().nullable(),
		originalPaymentId: z.string().uuid().nullable(),
		actorId: z.string().trim().min(1),
		correlationId: z.string().trim().min(1),
	})
	.strict();
const paymentMethodPayloadSchema = z
	.object({
		organizationId: z.string().trim().min(1),
		paymentMethodId: z.string().uuid(),
		code: z.string().trim().min(1),
		kind: paymentMethodKind,
		active: z.boolean(),
		actorId: z.string().trim().min(1),
		correlationId: z.string().trim().min(1),
	})
	.strict();
const clearancePayloadSchema = z
	.object({
		organizationId: z.string().trim().min(1),
		paymentId: z.string().uuid(),
		status: z.enum(["not-applicable", "pending", "cleared", "rejected"]),
		clearanceDate: z.string().nullable(),
		settlementReference: z.string().nullable(),
		reason: z.string().nullable(),
		actorId: z.string().trim().min(1),
		correlationId: z.string().trim().min(1),
	})
	.strict();
export const applicationInstructionPayloadSchema = z
	.object({
		organizationId: z.string().trim().min(1),
		paymentId: z.string().uuid(),
		instructionId: z.string().uuid(),
		targetModule: z.enum(["receivables", "payables"]),
		targetDocumentType: z.enum([
			"customer_invoice",
			"customer_credit",
			"supplier_invoice",
			"supplier_credit",
		]),
		targetDocumentId: z.string().uuid(),
		intendedAmount: money,
		appliedAmount: money,
		currencyCode: z.string().trim().length(3),
		status: z.enum([
			"pending",
			"applied",
			"partially_applied",
			"rejected",
			"reversed",
		]),
		rejectionCode: z.string().nullable(),
		actorId: z.string().trim().min(1),
		correlationId: z.string().trim().min(1),
	})
	.strict();
export const PaymentsEventSchemas = {
	"payments.payment.created.v1": paymentPayloadSchema,
	"payments.payment.posted.v1": paymentPayloadSchema,
	"payments.payment.reversed.v1": paymentPayloadSchema.extend({
		reversalId: z.string().uuid(),
		reason: z.string().trim().min(1),
	}),
	"payments.refund.posted.v1": paymentPayloadSchema.extend({
		refundSource: z.enum(["customer_payment", "customer_credit", "manual"]),
	}),
	"payments.payment_method.created.v1": paymentMethodPayloadSchema,
	"payments.payment_method.updated.v1": paymentMethodPayloadSchema,
	"payments.payment_method.deactivated.v1": paymentMethodPayloadSchema,
	"payments.payment.instrument_clearance_updated.v1": clearancePayloadSchema,
	"payments.application_instruction.created.v1":
		applicationInstructionPayloadSchema,
	"payments.application_instruction.applied.v1":
		applicationInstructionPayloadSchema.extend({
			realizedFx: signedMoney.nullable(),
			paymentRate: money.nullable(),
			documentBookedRate: money.nullable(),
		}),
	"payments.application_instruction.rejected.v1":
		applicationInstructionPayloadSchema,
	"payments.transfer.posted.v1": z
		.object({
			organizationId: z.string().trim().min(1),
			transferGroupId: z.string().uuid(),
			outgoingPaymentId: z.string().uuid(),
			incomingPaymentId: z.string().uuid(),
			amount: money,
			currencyCode: z.string().trim().length(3),
			actorId: z.string().trim().min(1),
			correlationId: z.string().trim().min(1),
		})
		.strict(),
} as const;
export type PaymentPayload = z.infer<typeof paymentPayloadSchema>;
export type PaymentsEventType = keyof typeof PaymentsEventSchemas;
export const PAYMENTS_PAYMENT_CREATED_EVENT =
	"payments.payment.created.v1" as const;
export const PAYMENTS_PAYMENT_POSTED_EVENT =
	"payments.payment.posted.v1" as const;
export const PAYMENTS_PAYMENT_REVERSED_EVENT =
	"payments.payment.reversed.v1" as const;
export const PAYMENTS_REFUND_POSTED_EVENT =
	"payments.refund.posted.v1" as const;
export const PAYMENTS_APPLICATION_INSTRUCTION_CREATED_EVENT =
	"payments.application_instruction.created.v1" as const;
export const PAYMENTS_APPLICATION_INSTRUCTION_APPLIED_EVENT =
	"payments.application_instruction.applied.v1" as const;
export const PAYMENTS_APPLICATION_INSTRUCTION_REJECTED_EVENT =
	"payments.application_instruction.rejected.v1" as const;
export const PAYMENTS_TRANSFER_POSTED_EVENT =
	"payments.transfer.posted.v1" as const;
export const PAYMENTS_PAYMENT_METHOD_CREATED_EVENT =
	"payments.payment_method.created.v1" as const;
export const PAYMENTS_PAYMENT_METHOD_UPDATED_EVENT =
	"payments.payment_method.updated.v1" as const;
export const PAYMENTS_PAYMENT_METHOD_DEACTIVATED_EVENT =
	"payments.payment_method.deactivated.v1" as const;
export const PAYMENTS_PAYMENT_INSTRUMENT_CLEARANCE_UPDATED_EVENT =
	"payments.payment.instrument_clearance_updated.v1" as const;
export const PAYMENTS_EVENT_IDS = Object.keys(
	PaymentsEventSchemas,
) as PaymentsEventType[];
