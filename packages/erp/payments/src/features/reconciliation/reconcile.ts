import type {
	Payment,
	PaymentApplicationInstruction,
	PaymentInstrument,
} from "../../kernel/contracts/domain";

interface ReconcileInput {
	payments: Payment[];
}

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

function deductionTotal(payment: Payment, effect: string): number {
	return payment.deductions
		.filter((deduction) => deduction.effect === effect)
		.reduce((sum, deduction) => sum + Number(deduction.amount), 0);
}

function instrumentReference(
	instrument: PaymentInstrument | null,
): string | null {
	if (instrument === null) {
		return null;
	}
	switch (instrument.kind) {
		case "check":
			return instrument.number;
		case "bank-transfer":
			return instrument.bankReference;
		case "card":
			return (
				instrument.settlementReference ??
				instrument.authorizationReference ??
				null
			);
		case "gateway":
			return instrument.providerReference;
		case "other":
			return instrument.reference ?? null;
		default:
			throw new Error("Unreachable instrument kind");
	}
}

/**
 * Widened matching contract for external (bank-line) reconciliation.
 * Bank lines match against cashMovement, not the gross amount.
 */
export interface PaymentMatchingProjection {
	cashMovement: string;
	deductionsTotal: string;
	functionalAmount: string;
	instrumentReference: string | null;
	paymentId: string;
	paymentMethodId: string;
	transactionAmount: string;
	transactionCurrency: string;
}

export function paymentMatchingProjection(
	payment: Payment,
): PaymentMatchingProjection {
	return {
		paymentId: payment.id,
		paymentMethodId: payment.paymentMethodId,
		instrumentReference: instrumentReference(payment.instrument),
		transactionCurrency: payment.currencyCode,
		transactionAmount: payment.amount,
		functionalAmount: payment.functionalAmount,
		deductionsTotal: String(
			deductionTotal(payment, "reduces_application_only"),
		),
		cashMovement: String(
			Number(payment.amount) - deductionTotal(payment, "reduces_cash_movement"),
		),
	};
}

function findTransferDrift(
	payment: Payment,
	byId: ReadonlyMap<string, Payment>,
): string[] {
	if (
		payment.purpose !== "internal_transfer" ||
		payment.transferGroupId === null ||
		payment.linkedPaymentId === null
	) {
		return [];
	}
	const peer = byId.get(payment.linkedPaymentId);
	if (peer === undefined) {
		return [
			`Transfer payment ${payment.id} missing linked peer ${payment.linkedPaymentId}`,
		];
	}
	const findings: string[] = [];
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
	return findings;
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
		if (payment.status !== "posted") {
			continue;
		}
		const intended = intendedTotal(payment.applicationInstructions);
		const refunded = refundedByOriginal.get(payment.id) ?? 0;
		const posted =
			Number(payment.amount) -
			deductionTotal(payment, "reduces_application_only");
		if (intended + refunded > posted + 1e-9) {
			findings.push(
				`Payment ${payment.id} over-applied (posted=${posted}, intended=${intended}, refunded=${refunded})`,
			);
		}
		findings.push(...findTransferDrift(payment, byId));
	}

	return findings.length === 0 ? { ok: true } : { ok: false, findings };
}
