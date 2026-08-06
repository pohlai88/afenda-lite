import { z } from "zod";

import { payrollRunIdSchema } from "../../kernel/identity/brands";
import {
	payrollActorUserIdSchema,
	payrollCorrelationIdSchema,
	payrollDecimalStringSchema,
	payrollIdempotencyKeySchema,
	payrollOrganizationIdSchema,
} from "../../kernel/validation/common.schema";

export const payrollPaymentSettlementStatusSchema = z.enum([
	"settled",
	"failed",
	"returned",
	"partially_settled",
]);

export const recordPaymentSettlementInputSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		runId: payrollRunIdSchema,
		paymentId: z.string().uuid(),
		settlementStatus: payrollPaymentSettlementStatusSchema,
		actualAmount: payrollDecimalStringSchema,
		currencyCode: z.string().trim().length(3),
		idempotencyKey: payrollIdempotencyKeySchema,
		actorUserId: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();

export const recordPostingConfirmationInputSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		runId: payrollRunIdSchema,
		journalId: z.string().uuid(),
		actualAmount: payrollDecimalStringSchema,
		currencyCode: z.string().trim().length(3),
		idempotencyKey: payrollIdempotencyKeySchema,
		actorUserId: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();
