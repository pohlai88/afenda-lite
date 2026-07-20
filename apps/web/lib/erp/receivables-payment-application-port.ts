import { ok, type Result } from "@afenda/errors/result";
import { getPaymentById } from "@afenda/payments";
import type { PaymentApplicationQueryPort } from "@afenda/receivables";

import { createPaymentsCommandOptions } from "@/lib/erp/payments-command-options";

const SCALE = 1_000_000n;

function decimal(value: string): bigint {
	const [whole = "0", fraction = ""] = value.split(".");
	return BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, "0").slice(0, 6));
}

function formatDecimal(value: bigint): string {
	const whole = value / SCALE;
	const fraction = (value % SCALE)
		.toString()
		.padStart(6, "0")
		.replace(/0+$/, "");
	return fraction.length > 0 ? `${whole}.${fraction}` : whole.toString();
}

/**
 * Composition-root adapter — Receivables never imports `@afenda/payments` stores.
 * Instruction remaining = intended − applied (payment-level reservation already held).
 */
export function createPaymentApplicationQueryPort(): PaymentApplicationQueryPort {
	return {
		async getInstructionAvailability(input: {
			organizationId: string;
			paymentId: string;
			paymentApplicationInstructionId: string;
			actorUserId: string;
		}): Promise<
			Result<{
				paymentStatus: string;
				instructionStatus: string;
				currencyCode: string;
				availableAmount: string;
				targetDocumentId: string;
			} | null>
		> {
			const result = await getPaymentById(
				{
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					id: input.paymentId,
				},
				createPaymentsCommandOptions(),
			);
			if (!result.ok) return result;
			if (result.data === null) return ok(null);
			const payment = result.data;
			const instruction = payment.applicationInstructions.find(
				(candidate) => candidate.id === input.paymentApplicationInstructionId,
			);
			if (instruction === undefined) return ok(null);
			const remaining =
				decimal(instruction.intendedAmount) -
				decimal(instruction.appliedAmount);
			return ok({
				paymentStatus: payment.status,
				instructionStatus: instruction.status,
				currencyCode: instruction.currencyCode,
				availableAmount: formatDecimal(remaining < 0n ? 0n : remaining),
				targetDocumentId: instruction.targetDocumentId,
			});
		},
	};
}
