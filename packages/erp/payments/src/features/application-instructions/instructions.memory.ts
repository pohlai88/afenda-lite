import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";

import type {
	Payment,
	PaymentApplicationAvailability,
	PaymentApplicationInstruction,
} from "../../kernel/contracts/domain";
import { decimal, formatDecimal } from "../../kernel/money";
import { resolveApplicationFx } from "../payment-lifecycle/fx-policy";
import type { PaymentApplicationInstructionsStore } from "./instructions.store";

/** Per-effect deduction totals in transaction currency. */
export function deductionTotals(payment: Payment): {
	applicationOnly: bigint;
	cashMovementReduction: bigint;
} {
	let applicationOnly = 0n;
	let cashMovementReduction = 0n;
	for (const deduction of payment.deductions) {
		if (deduction.effect === "reduces_application_only") {
			applicationOnly += decimal(deduction.amount);
		} else if (deduction.effect === "reduces_cash_movement") {
			cashMovementReduction += decimal(deduction.amount);
		}
	}
	return { applicationOnly, cashMovementReduction };
}

export interface ApplicationInstructionsMemoryState {
	mutationKeys: Map<string, string>;
	payments: Map<string, Payment>;
}

function resolveOperation<T>(operation: () => Result<T>): Promise<Result<T>> {
	try {
		return Promise.resolve(operation());
	} catch (error) {
		return Promise.reject(error);
	}
}

function find(
	state: ApplicationInstructionsMemoryState,
	organizationId: string,
	id: string,
): Result<Payment> {
	const found = state.payments.get(id);
	return found === undefined || found.organizationId !== organizationId
		? errorResult.fail("NOT_FOUND", { publicMessage: "Payment not found" })
		: errorResult.ok(found);
}

function findInstruction(
	state: ApplicationInstructionsMemoryState,
	organizationId: string,
	instructionId: string,
): { payment: Payment; instruction: PaymentApplicationInstruction } | null {
	for (const payment of state.payments.values()) {
		if (payment.organizationId !== organizationId) {
			continue;
		}
		const instruction = payment.applicationInstructions.find(
			(candidate) => candidate.id === instructionId,
		);
		if (instruction !== undefined) {
			return { payment, instruction };
		}
	}
	return null;
}

function idempotent(
	state: ApplicationInstructionsMemoryState,
	organizationId: string,
	key: string,
	resourceId: string,
): Result<void> {
	const full = `${organizationId}:${key}`;
	const existing = state.mutationKeys.get(full);
	if (existing !== undefined && existing !== resourceId) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Idempotency key conflicts with another mutation",
		});
	}
	state.mutationKeys.set(full, resourceId);
	return errorResult.ok(undefined);
}

export function createMemoryApplicationInstructionMethods(
	state: ApplicationInstructionsMemoryState,
): PaymentApplicationInstructionsStore {
	return {
		addApplicationInstruction(
			record: Parameters<
				PaymentApplicationInstructionsStore["addApplicationInstruction"]
			>[0],
		): Promise<Result<PaymentApplicationInstruction>> {
			return resolveOperation(() => {
				const found = find(state, record.organizationId, record.paymentId);
				if (!found.ok) {
					return found;
				}
				const payment = found.data;
				if (payment.status !== "draft") {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Application instructions require a draft payment",
					});
				}
				if (
					(payment.direction === "receipt" &&
						record.targetModule !== "receivables") ||
					(payment.direction === "disbursement" &&
						record.targetModule !== "payables")
				) {
					return errorResult.fail("CONFLICT", {
						publicMessage:
							"Application target is incompatible with payment direction",
					});
				}
				const allocated = payment.applicationInstructions
					.filter((candidate) =>
						["pending", "applied", "partially_applied"].includes(
							candidate.status,
						),
					)
					.reduce(
						(total, candidate) => total + decimal(candidate.intendedAmount),
						0n,
					);
				if (
					allocated + decimal(record.intendedAmount) >
					decimal(payment.amount) - deductionTotals(payment).applicationOnly
				) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Application exceeds payment amount",
					});
				}
				const instruction: PaymentApplicationInstruction = {
					id: randomUUID(),
					organizationId: record.organizationId,
					paymentId: payment.id,
					targetModule: record.targetModule,
					targetDocumentType: record.targetDocumentType,
					targetDocumentId: record.targetDocumentId,
					intendedAmount: record.intendedAmount,
					appliedAmount: "0",
					currencyCode: record.currencyCode,
					fx: null,
					realizedFx: null,
					status: "pending",
					rejectionCode: null,
					createdBy: record.actorUserId,
					createdAt: new Date(),
					updatedAt: new Date(),
				};
				const idem = idempotent(
					state,
					record.organizationId,
					record.idempotencyKey,
					instruction.id,
				);
				if (!idem.ok) {
					return idem;
				}
				payment.applicationInstructions.push(instruction);
				payment.version += 1;
				payment.updatedBy = record.actorUserId;
				payment.updatedAt = instruction.createdAt;
				return errorResult.ok({ ...instruction });
			});
		},

		markInstructionApplied(
			record: Parameters<
				PaymentApplicationInstructionsStore["markInstructionApplied"]
			>[0],
		): Promise<Result<PaymentApplicationInstruction>> {
			return resolveOperation(() => {
				const found = findInstruction(
					state,
					record.organizationId,
					record.instructionId,
				);
				if (found === null) {
					return errorResult.fail("NOT_FOUND", {
						publicMessage: "Payment application instruction not found",
					});
				}
				const { payment, instruction } = found;
				if (
					decimal(record.appliedAmount) > decimal(instruction.intendedAmount)
				) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Applied amount exceeds intended amount",
					});
				}
				const applicationFx = resolveApplicationFx({
					appliedAmount: record.appliedAmount,
					applicationFx: record.fx,
					paymentFx: payment.fxContext,
				});
				if (!applicationFx.ok) {
					return applicationFx;
				}
				instruction.fx = applicationFx.data.fx;
				instruction.realizedFx = applicationFx.data.realizedFx;
				instruction.appliedAmount = record.appliedAmount;
				instruction.status =
					decimal(record.appliedAmount) === decimal(instruction.intendedAmount)
						? "applied"
						: "partially_applied";
				instruction.updatedAt = new Date();
				return errorResult.ok({ ...instruction });
			});
		},

		markInstructionRejected(
			record: Parameters<
				PaymentApplicationInstructionsStore["markInstructionRejected"]
			>[0],
		): Promise<Result<PaymentApplicationInstruction>> {
			return resolveOperation(() => {
				for (const payment of state.payments.values()) {
					const instruction = payment.applicationInstructions.find(
						(candidate) => candidate.id === record.instructionId,
					);
					if (
						instruction !== undefined &&
						payment.organizationId === record.organizationId
					) {
						if (
							instruction.status !== "pending" &&
							instruction.status !== "partially_applied" &&
							instruction.status !== "applied"
						) {
							return errorResult.fail("CONFLICT", {
								publicMessage: "Application instruction cannot be rejected",
							});
						}
						instruction.status =
							record.rejectionCode === "PAYMENT_REVERSED"
								? "reversed"
								: "rejected";
						instruction.rejectionCode = record.rejectionCode;
						instruction.updatedAt = new Date();
						return errorResult.ok({ ...instruction });
					}
				}
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Payment application instruction not found",
				});
			});
		},

		getApplicationAvailability(
			organizationId: string,
			paymentId: string,
		): Promise<Result<PaymentApplicationAvailability>> {
			return resolveOperation(() => {
				const found = find(state, organizationId, paymentId);
				if (!found.ok) {
					return found;
				}
				if (found.data.status !== "posted") {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Application availability requires a posted payment",
					});
				}
				const intended = found.data.applicationInstructions
					.filter((instruction) =>
						["pending", "applied", "partially_applied"].includes(
							instruction.status,
						),
					)
					.reduce(
						(sum, instruction) => sum + decimal(instruction.intendedAmount),
						0n,
					);
				const refunded = [...state.payments.values()]
					.filter(
						(payment) =>
							payment.organizationId === organizationId &&
							payment.originalPaymentId === paymentId &&
							payment.status === "posted",
					)
					.reduce((sum, payment) => sum + decimal(payment.amount), 0n);
				const totals = deductionTotals(found.data);
				return errorResult.ok({
					paymentId,
					currencyCode: found.data.currencyCode,
					postedAmount: found.data.amount,
					intendedAmount: formatDecimal(intended),
					refundedAmount: formatDecimal(refunded),
					deductionsTotal: formatDecimal(totals.applicationOnly),
					cashMovement: formatDecimal(
						decimal(found.data.amount) - totals.cashMovementReduction,
					),
					availableToApply: formatDecimal(
						decimal(found.data.amount) -
							intended -
							refunded -
							totals.applicationOnly,
					),
				});
			});
		},
	};
}
