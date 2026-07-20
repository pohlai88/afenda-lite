import type { Payment, PaymentApplicationInstruction } from "./model";

type ReconcileInput = {
	payments: Payment[];
};

type ReconcileResult = { ok: true } | { ok: false; findings: string[] };

const ACTIVE_INSTRUCTION_STATUSES = new Set([
	"pending",
	"applied",
	"partially_applied",
]);

function intendedTotal(instructions: PaymentApplicationInstruction[]): number {
	return instructions
		.filter((instruction) =>
			ACTIVE_INSTRUCTION_STATUSES.has(instruction.status),
		)
		.reduce((sum, instruction) => sum + Number(instruction.intendedAmount), 0);
}

/**
 * Offline consistency checks for payments projections.
 * - Posted amount ≥ active application intended + posted refunds
 * - Transfer pairs share transferGroupId, amount, and opposite accounts
 */
export function reconcilePayments(input: ReconcileInput): ReconcileResult {
	const findings: string[] = [];
	const byId = new Map(input.payments.map((payment) => [payment.id, payment]));
	const refundedByOriginal = new Map<string, number>();

	for (const payment of input.payments) {
		if (
			payment.direction === "refund" &&
			payment.status === "posted" &&
			payment.originalPaymentId !== null
		) {
			refundedByOriginal.set(
				payment.originalPaymentId,
				(refundedByOriginal.get(payment.originalPaymentId) ?? 0) +
					Number(payment.amount),
			);
		}
	}

	for (const payment of input.payments) {
		if (payment.status !== "posted") continue;
		const intended = intendedTotal(payment.applicationInstructions);
		const refunded = refundedByOriginal.get(payment.id) ?? 0;
		const posted = Number(payment.amount);
		if (intended + refunded > posted + 1e-9) {
			findings.push(
				`Payment ${payment.id} over-applied (posted=${posted}, intended=${intended}, refunded=${refunded})`,
			);
		}
		if (
			payment.purpose === "internal_transfer" &&
			payment.transferGroupId !== null &&
			payment.linkedPaymentId !== null
		) {
			const peer = byId.get(payment.linkedPaymentId);
			if (peer === undefined) {
				findings.push(
					`Transfer payment ${payment.id} missing linked peer ${payment.linkedPaymentId}`,
				);
				continue;
			}
			if (peer.transferGroupId !== payment.transferGroupId) {
				findings.push(
					`Transfer pair ${payment.id}/${peer.id} transferGroupId mismatch`,
				);
			}
			if (peer.amount !== payment.amount) {
				findings.push(`Transfer pair ${payment.id}/${peer.id} amount mismatch`);
			}
			if (peer.paymentAccountId === payment.paymentAccountId) {
				findings.push(
					`Transfer pair ${payment.id}/${peer.id} shares payment account`,
				);
			}
		}
	}

	return findings.length === 0 ? { ok: true } : { ok: false, findings };
}
