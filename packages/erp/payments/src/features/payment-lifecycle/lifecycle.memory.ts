import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";

import type {
	InstrumentClearanceStatus,
	Payment,
	PaymentAccount,
	PaymentDeduction,
} from "../../kernel/contracts/domain";
import { decimal } from "../../kernel/money";
import { deriveFunctionalAmount } from "./fx-policy";
import type {
	PaymentCreateRecord,
	PaymentsLifecycleStore,
} from "./lifecycle.store";

export interface PaymentLifecycleMemoryState {
	accounts: Map<string, PaymentAccount>;
	mutationKeys: Map<string, string>;
	payments: Map<string, Payment>;
}

export function clonePayment(payment: Payment): Payment {
	return {
		...payment,
		counterpartySnapshot:
			payment.counterpartySnapshot === null
				? null
				: { ...payment.counterpartySnapshot },
		applicationInstructions: payment.applicationInstructions.map(
			(instruction) => ({ ...instruction }),
		),
		deductions: payment.deductions.map((deduction) => ({ ...deduction })),
		instrument: payment.instrument === null ? null : { ...payment.instrument },
		fxContext: payment.fxContext === null ? null : { ...payment.fxContext },
		methodSnapshot:
			payment.methodSnapshot === null ? null : { ...payment.methodSnapshot },
		reversal: payment.reversal === null ? null : { ...payment.reversal },
	};
}

/** Checks and bank transfers carry a clearance lifecycle; the rest do not. */
function initialClearanceStatus(
	instrument: Payment["instrument"],
): InstrumentClearanceStatus {
	return instrument !== null &&
		(instrument.kind === "check" || instrument.kind === "bank-transfer")
		? "pending"
		: "not-applicable";
}

/** Guards shared by every clearance transition; null when the change may proceed. */
function clearanceTransitionRejection(
	payment: Payment,
	record: { expectedVersion: number; status: InstrumentClearanceStatus },
): Result<Payment> | null {
	if (payment.status !== "posted") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Instrument clearance can only change on posted payments",
		});
	}
	if (payment.version !== record.expectedVersion) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Payment version conflict",
		});
	}
	if (
		record.status === "not-applicable" &&
		payment.clearanceStatus !== "not-applicable"
	) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "A clearable instrument cannot return to not-applicable",
		});
	}
	return null;
}

/** Merges clearance evidence into a check instrument; other kinds keep theirs. */
function mergeClearanceEvidence(
	payment: Payment,
	record: { clearanceDate: string | null; settlementReference: string | null },
): void {
	if (payment.instrument === null || payment.instrument.kind !== "check") {
		return;
	}
	payment.instrument = {
		...payment.instrument,
		...(record.clearanceDate === null
			? {}
			: { clearanceDate: record.clearanceDate }),
		...(record.settlementReference === null
			? {}
			: { bankReference: record.settlementReference }),
	};
}

/** Freezes each deduction line's functional value at posting time. */
function freezeDeductionFunctionalAmounts(payment: Payment): void {
	payment.deductions = payment.deductions.map((deduction) => ({
		...deduction,
		functionalAmount: deriveFunctionalAmount(
			deduction.amount,
			payment.fxContext,
		),
	}));
}

function resolveOperation<T>(operation: () => Result<T>): Promise<Result<T>> {
	try {
		return Promise.resolve(operation());
	} catch (error) {
		return Promise.reject(error);
	}
}

function find(
	state: PaymentLifecycleMemoryState,
	organizationId: string,
	id: string,
): Result<Payment> {
	const found = state.payments.get(id);
	return found === undefined || found.organizationId !== organizationId
		? errorResult.fail("NOT_FOUND", { publicMessage: "Payment not found" })
		: errorResult.ok(found);
}

function account(
	state: PaymentLifecycleMemoryState,
	organizationId: string,
	id: string,
): Result<PaymentAccount> {
	const found = state.accounts.get(id);
	return found === undefined || found.organizationId !== organizationId
		? errorResult.fail("NOT_FOUND", {
				publicMessage: "Payment account not found",
			})
		: errorResult.ok(found);
}

function idempotent(
	state: PaymentLifecycleMemoryState,
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

function buildDraft(
	state: PaymentLifecycleMemoryState,
	record: PaymentCreateRecord,
): Result<Payment> {
	const owner = account(state, record.organizationId, record.paymentAccountId);
	if (!owner.ok) {
		return owner;
	}
	if (owner.data.currencyCode !== record.currencyCode) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Payment account currency differs from payment currency",
		});
	}
	for (const payment of state.payments.values()) {
		if (
			payment.organizationId === record.organizationId &&
			payment.normalizedCode === record.normalizedCode
		) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Payment code already exists",
			});
		}
	}
	const now = new Date();
	const paymentId = randomUUID();
	const deductions: PaymentDeduction[] = record.deductions.map((line) => ({
		...line,
		id: randomUUID(),
		paymentId,
		description: line.description ?? null,
		functionalAmount: null,
		createdAt: now,
		createdBy: record.actorUserId,
	}));
	return errorResult.ok({
		id: paymentId,
		organizationId: record.organizationId,
		code: record.code,
		normalizedCode: record.normalizedCode,
		paymentAccountId: record.paymentAccountId,
		paymentMethodId: record.paymentMethodId,
		methodSnapshot: record.methodSnapshot,
		instrument: record.instrument,
		clearanceStatus: initialClearanceStatus(record.instrument),
		fxContext: record.fxContext,
		functionalAmount: record.functionalAmount,
		deductions,
		direction: record.direction,
		purpose: record.purpose,
		status: "draft",
		counterpartyId: record.counterpartyId,
		counterpartySnapshot: record.counterpartySnapshot,
		transferGroupId: record.transferGroupId,
		linkedPaymentId: record.linkedPaymentId,
		originalPaymentId: record.originalPaymentId,
		refundSource: record.refundSource,
		currencyCode: record.currencyCode,
		amount: record.amount,
		reference: record.reference,
		createIdempotencyKey: record.createIdempotencyKey,
		postIdempotencyKey: null,
		reverseIdempotencyKey: null,
		clearanceIdempotencyKey: null,
		version: 1,
		createdBy: record.actorUserId,
		updatedBy: record.actorUserId,
		postedAt: null,
		postedBy: null,
		reversedAt: null,
		reversedBy: null,
		createdAt: now,
		updatedAt: now,
		applicationInstructions: [],
		reversal: null,
	});
}

function validateTransferAccounts(
	state: PaymentLifecycleMemoryState,
	record: Parameters<PaymentsLifecycleStore["createAndPostTransfer"]>[0],
): Result<void> {
	if (record.fromPaymentAccountId === record.toPaymentAccountId) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Transfer accounts must differ",
		});
	}
	const from = account(
		state,
		record.organizationId,
		record.fromPaymentAccountId,
	);
	if (!from.ok) {
		return from;
	}
	const to = account(state, record.organizationId, record.toPaymentAccountId);
	if (!to.ok) {
		return to;
	}
	if (!(from.data.active && to.data.active)) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Transfer requires active payment accounts",
		});
	}
	if (
		from.data.currencyCode !== record.currencyCode ||
		to.data.currencyCode !== record.currencyCode
	) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Transfer account currencies must match payment currency",
		});
	}
	return errorResult.ok(undefined);
}

export function createMemoryPaymentLifecycleMethods(
	state: PaymentLifecycleMemoryState,
): PaymentsLifecycleStore {
	return {
		createDraft(record: PaymentCreateRecord): Promise<Result<Payment>> {
			return resolveOperation(() => {
				for (const payment of state.payments.values()) {
					if (
						payment.organizationId === record.organizationId &&
						payment.createIdempotencyKey === record.createIdempotencyKey
					) {
						return errorResult.ok(clonePayment(payment));
					}
				}
				const created = buildDraft(state, record);
				if (!created.ok) {
					return created;
				}
				const idem = idempotent(
					state,
					record.organizationId,
					record.createIdempotencyKey,
					created.data.id,
				);
				if (!idem.ok) {
					return idem;
				}
				state.payments.set(created.data.id, created.data);
				return errorResult.ok(clonePayment(created.data));
			});
		},

		post(
			record: Parameters<PaymentsLifecycleStore["post"]>[0],
		): Promise<Result<Payment>> {
			return resolveOperation(() => {
				const found = find(state, record.organizationId, record.paymentId);
				if (!found.ok) {
					return found;
				}
				const payment = found.data;
				if (payment.status !== "draft" || payment.direction === "refund") {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Only draft non-refund payments can be posted",
					});
				}
				if (payment.version !== record.expectedVersion) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Payment version conflict",
					});
				}
				const previous = clonePayment(payment);
				const now = new Date();
				payment.status = "posted";
				payment.methodSnapshot = { ...record.methodSnapshot };
				freezeDeductionFunctionalAmounts(payment);
				payment.postIdempotencyKey = record.idempotencyKey;
				payment.postedAt = now;
				payment.postedBy = record.actorUserId;
				payment.updatedAt = now;
				payment.updatedBy = record.actorUserId;
				payment.version += 1;
				const idem = idempotent(
					state,
					record.organizationId,
					record.idempotencyKey,
					payment.id,
				);
				if (!idem.ok) {
					state.payments.set(payment.id, previous);
					return idem;
				}
				return errorResult.ok(clonePayment(payment));
			});
		},

		reverse(
			record: Parameters<PaymentsLifecycleStore["reverse"]>[0],
		): Promise<Result<Payment>> {
			return resolveOperation(() => {
				const found = find(state, record.organizationId, record.paymentId);
				if (!found.ok) {
					return found;
				}
				const payment = found.data;
				if (payment.status !== "posted") {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Only posted payments can be reversed",
					});
				}
				if (payment.version !== record.expectedVersion) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Payment version conflict",
					});
				}
				const previous = clonePayment(payment);
				const now = new Date();
				const reversal = {
					id: randomUUID(),
					organizationId: payment.organizationId,
					paymentId: payment.id,
					reason: record.reason,
					reversedBy: record.actorUserId,
					reversedAt: now,
				};
				payment.status = "reversed";
				payment.reverseIdempotencyKey = record.idempotencyKey;
				payment.reversal = reversal;
				payment.reversedAt = now;
				payment.reversedBy = record.actorUserId;
				payment.updatedAt = now;
				payment.updatedBy = record.actorUserId;
				payment.version += 1;
				const idem = idempotent(
					state,
					record.organizationId,
					record.idempotencyKey,
					payment.id,
				);
				if (!idem.ok) {
					state.payments.set(payment.id, previous);
					return idem;
				}
				return errorResult.ok(clonePayment(payment));
			});
		},

		createAndPostTransfer(
			record: Parameters<PaymentsLifecycleStore["createAndPostTransfer"]>[0],
		): Promise<
			Result<{
				outgoing: Payment;
				incoming: Payment;
			}>
		> {
			return resolveOperation(() => {
				const validated = validateTransferAccounts(state, record);
				if (!validated.ok) {
					return validated;
				}
				const group = randomUUID();
				const outgoing = buildDraft(state, {
					organizationId: record.organizationId,
					code: `${record.code}-OUT`,
					normalizedCode: `${record.normalizedCode}-OUT`,
					paymentAccountId: record.fromPaymentAccountId,
					paymentMethodId: record.paymentMethodId,
					methodSnapshot: record.methodSnapshot,
					instrument: null,
					fxContext: null,
					functionalAmount: record.amount,
					deductions: [],
					direction: "disbursement",
					purpose: "internal_transfer",
					counterpartyId: null,
					counterpartySnapshot: null,
					transferGroupId: group,
					linkedPaymentId: null,
					originalPaymentId: null,
					refundSource: null,
					currencyCode: record.currencyCode,
					amount: record.amount,
					reference: record.reference,
					createIdempotencyKey: `${record.idempotencyKey}:out`,
					actorUserId: record.actorUserId,
					correlationId: record.correlationId,
				});
				if (!outgoing.ok) {
					return outgoing;
				}
				const incoming = buildDraft(state, {
					organizationId: record.organizationId,
					code: `${record.code}-IN`,
					normalizedCode: `${record.normalizedCode}-IN`,
					paymentAccountId: record.toPaymentAccountId,
					paymentMethodId: record.paymentMethodId,
					methodSnapshot: record.methodSnapshot,
					instrument: null,
					fxContext: null,
					functionalAmount: record.amount,
					deductions: [],
					direction: "receipt",
					purpose: "internal_transfer",
					counterpartyId: null,
					counterpartySnapshot: null,
					transferGroupId: group,
					linkedPaymentId: outgoing.data.id,
					originalPaymentId: null,
					refundSource: null,
					currencyCode: record.currencyCode,
					amount: record.amount,
					reference: record.reference,
					createIdempotencyKey: `${record.idempotencyKey}:in`,
					actorUserId: record.actorUserId,
					correlationId: record.correlationId,
				});
				if (!incoming.ok) {
					return incoming;
				}
				const now = new Date();
				outgoing.data.linkedPaymentId = incoming.data.id;
				for (const payment of [outgoing.data, incoming.data]) {
					payment.status = "posted";
					payment.postedAt = now;
					payment.postedBy = record.actorUserId;
					payment.postIdempotencyKey = record.idempotencyKey;
					state.payments.set(payment.id, payment);
				}
				return errorResult.ok({
					outgoing: clonePayment(outgoing.data),
					incoming: clonePayment(incoming.data),
				});
			});
		},

		postRefund(
			record: Parameters<PaymentsLifecycleStore["postRefund"]>[0],
		): Promise<Result<Payment>> {
			return resolveOperation(() => {
				const originalResult = find(
					state,
					record.organizationId,
					record.originalPaymentId,
				);
				if (!originalResult.ok) {
					return originalResult;
				}
				const original = originalResult.data;
				if (original.status !== "posted" || original.direction === "refund") {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Refund requires an active posted payment",
					});
				}
				const refunded = [...state.payments.values()]
					.filter(
						(row) =>
							row.organizationId === record.organizationId &&
							row.originalPaymentId === original.id &&
							row.status === "posted",
					)
					.reduce((total, row) => total + decimal(row.amount), 0n);
				if (refunded + decimal(record.amount) > decimal(original.amount)) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Refund exceeds remaining refundable amount",
					});
				}
				if (
					record.fxContext !== null &&
					record.fxContext.transactionCurrency !== original.currencyCode
				) {
					return errorResult.fail("CONFLICT", {
						publicMessage:
							"Refund FX context currency differs from the original payment currency",
					});
				}
				const draft = buildDraft(state, {
					...record,
					direction: "refund",
					purpose:
						original.direction === "receipt"
							? "customer_refund"
							: "supplier_refund_receipt",
					currencyCode: original.currencyCode,
					counterpartyId: original.counterpartyId,
					counterpartySnapshot: original.counterpartySnapshot,
					transferGroupId: null,
					linkedPaymentId: null,
					originalPaymentId: original.id,
					refundSource: record.refundSource,
					createIdempotencyKey: record.createIdempotencyKey,
				});
				if (!draft.ok) {
					return draft;
				}
				const refund = draft.data;
				refund.status = "posted";
				freezeDeductionFunctionalAmounts(refund);
				refund.postedAt = new Date();
				refund.postedBy = record.actorUserId;
				refund.postIdempotencyKey = record.createIdempotencyKey;
				state.payments.set(refund.id, refund);
				return errorResult.ok(clonePayment(refund));
			});
		},

		updateInstrumentClearance(
			record: Parameters<
				PaymentsLifecycleStore["updateInstrumentClearance"]
			>[0],
		): Promise<Result<Payment>> {
			return resolveOperation(() => {
				const found = find(state, record.organizationId, record.paymentId);
				if (!found.ok) {
					return found;
				}
				const payment = found.data;
				if (payment.clearanceIdempotencyKey === record.idempotencyKey) {
					return errorResult.ok(clonePayment(payment));
				}
				const rejection = clearanceTransitionRejection(payment, record);
				if (rejection !== null) {
					return rejection;
				}
				const previous = clonePayment(payment);
				const now = new Date();
				payment.clearanceStatus = record.status;
				payment.clearanceIdempotencyKey = record.idempotencyKey;
				mergeClearanceEvidence(payment, record);
				payment.updatedAt = now;
				payment.updatedBy = record.actorUserId;
				payment.version += 1;
				const idem = idempotent(
					state,
					record.organizationId,
					record.idempotencyKey,
					payment.id,
				);
				if (!idem.ok) {
					state.payments.set(payment.id, previous);
					return idem;
				}
				return errorResult.ok(clonePayment(payment));
			});
		},

		getById(
			organizationId: string,
			id: string,
		): Promise<Result<Payment | null>> {
			return resolveOperation(() => {
				const found = state.payments.get(id);
				return errorResult.ok(
					found !== undefined && found.organizationId === organizationId
						? clonePayment(found)
						: null,
				);
			});
		},

		list(
			filter: Parameters<PaymentsLifecycleStore["list"]>[0],
		): Promise<Result<Payment[]>> {
			return resolveOperation(() => {
				const start = (filter.page - 1) * filter.pageSize;
				return errorResult.ok(
					[...state.payments.values()]
						.filter((row) => row.organizationId === filter.organizationId)
						.filter(
							(row) =>
								filter.status === undefined || row.status === filter.status,
						)
						.filter(
							(row) =>
								filter.direction === undefined ||
								row.direction === filter.direction,
						)
						.sort(
							(left, right) =>
								right.updatedAt.getTime() - left.updatedAt.getTime(),
						)
						.slice(start, start + filter.pageSize)
						.map(clonePayment),
				);
			});
		},
	};
}
