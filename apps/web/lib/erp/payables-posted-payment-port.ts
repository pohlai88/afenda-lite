import { ok, type Result } from "@afenda/errors/result";
import type {
	PostedPaymentBasis,
	PostedPaymentQueryPort,
} from "@afenda/payables";
import { getPaymentById } from "@afenda/payments";

import { createPaymentsCommandOptions } from "@/lib/erp/payments-command-options";

/**
 * Composition-root posted-payment adapter — Payables never creates Payment rows.
 */
export function createPostedPaymentQueryPort(
	actorUserId: string,
): PostedPaymentQueryPort {
	return {
		async getPostedPayment(input: {
			organizationId: string;
			paymentId: string;
		}): Promise<Result<PostedPaymentBasis | null>> {
			const result = await getPaymentById(
				{
					organizationId: input.organizationId,
					actorUserId,
					id: input.paymentId,
				},
				createPaymentsCommandOptions(),
			);
			if (!result.ok) return result;
			if (result.data === null) return ok(null);
			const payment = result.data;
			if (payment.status !== "posted") {
				return ok(null);
			}
			return ok({
				paymentId: payment.id,
				status: "posted",
				currencyCode: payment.currencyCode,
				direction: payment.direction,
			});
		},
	};
}
