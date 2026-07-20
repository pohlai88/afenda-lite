import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";

import {
	PAYMENTS_ERROR_ACCOUNT_NOT_FOUND,
	PAYMENTS_ERROR_IDEMPOTENCY_CONFLICT,
	PAYMENTS_ERROR_INSTRUCTION_NOT_FOUND,
	PAYMENTS_ERROR_INSUFFICIENT_AVAILABILITY,
	PAYMENTS_ERROR_PAYMENT_NOT_FOUND,
	PAYMENTS_ERROR_REFUND_LIMIT_EXCEEDED,
	PAYMENTS_ERROR_TRANSFER_INVALID,
} from "./error-codes";
import { failPayments } from "./fail-payments";
import type {
	Payment,
	PaymentAccount,
	PaymentApplicationAvailability,
	PaymentApplicationInstruction,
	PaymentCreateRecord,
	PaymentsStore,
} from "./model";

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

function clonePayment(payment: Payment): Payment {
	return {
		...payment,
		counterpartySnapshot:
			payment.counterpartySnapshot === null
				? null
				: { ...payment.counterpartySnapshot },
		applicationInstructions: payment.applicationInstructions.map(
			(instruction) => ({ ...instruction }),
		),
		reversal: payment.reversal === null ? null : { ...payment.reversal },
	};
}

export class MemoryPaymentsStore implements PaymentsStore {
	private readonly payments = new Map<string, Payment>();
	private readonly accounts = new Map<string, PaymentAccount>();
	private readonly mutationKeys = new Map<string, string>();

	private find(organizationId: string, id: string): Result<Payment> {
		const found = this.payments.get(id);
		return found === undefined || found.organizationId !== organizationId
			? failPayments(
					"NOT_FOUND",
					"Payment not found",
					PAYMENTS_ERROR_PAYMENT_NOT_FOUND,
				)
			: ok(found);
	}

	private account(organizationId: string, id: string): Result<PaymentAccount> {
		const found = this.accounts.get(id);
		return found === undefined || found.organizationId !== organizationId
			? failPayments(
					"NOT_FOUND",
					"Payment account not found",
					PAYMENTS_ERROR_ACCOUNT_NOT_FOUND,
				)
			: ok(found);
	}

	private idempotent(
		organizationId: string,
		key: string,
		resourceId: string,
	): Result<void> {
		const full = `${organizationId}:${key}`;
		const existing = this.mutationKeys.get(full);
		if (existing !== undefined && existing !== resourceId) {
			return failPayments(
				"CONFLICT",
				"Idempotency key conflicts with another mutation",
				PAYMENTS_ERROR_IDEMPOTENCY_CONFLICT,
			);
		}
		this.mutationKeys.set(full, resourceId);
		return ok(undefined);
	}

	private buildDraft(record: PaymentCreateRecord): Result<Payment> {
		const account = this.account(
			record.organizationId,
			record.paymentAccountId,
		);
		if (!account.ok) return account;
		if (account.data.currencyCode !== record.currencyCode) {
			return fail(
				"CONFLICT",
				"Payment account currency differs from payment currency",
			);
		}
		for (const payment of this.payments.values()) {
			if (
				payment.organizationId === record.organizationId &&
				payment.normalizedCode === record.normalizedCode
			) {
				return fail("CONFLICT", "Payment code already exists");
			}
		}
		const now = new Date();
		return ok({
			id: randomUUID(),
			organizationId: record.organizationId,
			code: record.code,
			normalizedCode: record.normalizedCode,
			paymentAccountId: record.paymentAccountId,
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

	async createPaymentAccount(
		record: Omit<PaymentAccount, "id" | "createdAt" | "updatedAt">,
	): Promise<Result<PaymentAccount>> {
		for (const account of this.accounts.values()) {
			if (
				account.organizationId === record.organizationId &&
				account.normalizedCode === record.normalizedCode
			) {
				return fail("CONFLICT", "Payment account code already exists");
			}
		}
		const now = new Date();
		const account: PaymentAccount = {
			...record,
			id: randomUUID(),
			createdAt: now,
			updatedAt: now,
		};
		this.accounts.set(account.id, account);
		return ok({ ...account });
	}

	async listPaymentAccounts(
		organizationId: string,
	): Promise<Result<PaymentAccount[]>> {
		return ok(
			[...this.accounts.values()]
				.filter((account) => account.organizationId === organizationId)
				.map((account) => ({ ...account })),
		);
	}

	async createDraft(record: PaymentCreateRecord): Promise<Result<Payment>> {
		for (const payment of this.payments.values()) {
			if (
				payment.organizationId === record.organizationId &&
				payment.createIdempotencyKey === record.createIdempotencyKey
			) {
				return ok(clonePayment(payment));
			}
		}
		const created = this.buildDraft(record);
		if (!created.ok) return created;
		const idem = this.idempotent(
			record.organizationId,
			record.createIdempotencyKey,
			created.data.id,
		);
		if (!idem.ok) return idem;
		this.payments.set(created.data.id, created.data);
		return ok(clonePayment(created.data));
	}

	async addApplicationInstruction(
		record: Parameters<PaymentsStore["addApplicationInstruction"]>[0],
	): Promise<Result<PaymentApplicationInstruction>> {
		const found = this.find(record.organizationId, record.paymentId);
		if (!found.ok) return found;
		const payment = found.data;
		if (payment.status !== "draft") {
			return fail(
				"CONFLICT",
				"Application instructions require a draft payment",
			);
		}
		if (
			(payment.direction === "receipt" &&
				record.targetModule !== "receivables") ||
			(payment.direction === "disbursement" &&
				record.targetModule !== "payables")
		) {
			return fail(
				"CONFLICT",
				"Application target is incompatible with payment direction",
			);
		}
		const allocated = payment.applicationInstructions
			.filter((instruction) =>
				["pending", "applied", "partially_applied"].includes(
					instruction.status,
				),
			)
			.reduce(
				(total, instruction) => total + decimal(instruction.intendedAmount),
				0n,
			);
		if (allocated + decimal(record.intendedAmount) > decimal(payment.amount)) {
			return failPayments(
				"CONFLICT",
				"Application exceeds payment amount",
				PAYMENTS_ERROR_INSUFFICIENT_AVAILABILITY,
			);
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
			status: "pending",
			rejectionCode: null,
			createdBy: record.actorUserId,
			createdAt: new Date(),
			updatedAt: new Date(),
		};
		const idempotent = this.idempotent(
			record.organizationId,
			record.idempotencyKey,
			instruction.id,
		);
		if (!idempotent.ok) return idempotent;
		payment.applicationInstructions.push(instruction);
		payment.version += 1;
		payment.updatedBy = record.actorUserId;
		payment.updatedAt = instruction.createdAt;
		return ok({ ...instruction });
	}

	async post(
		record: Parameters<PaymentsStore["post"]>[0],
	): Promise<Result<Payment>> {
		const found = this.find(record.organizationId, record.paymentId);
		if (!found.ok) return found;
		const payment = found.data;
		if (payment.status !== "draft" || payment.direction === "refund") {
			return fail("CONFLICT", "Only draft non-refund payments can be posted");
		}
		if (payment.version !== record.expectedVersion) {
			return fail("CONFLICT", "Payment version conflict");
		}
		const previous = clonePayment(payment);
		const now = new Date();
		payment.status = "posted";
		payment.postIdempotencyKey = record.idempotencyKey;
		payment.postedAt = now;
		payment.postedBy = record.actorUserId;
		payment.updatedAt = now;
		payment.updatedBy = record.actorUserId;
		payment.version += 1;
		const idempotent = this.idempotent(
			record.organizationId,
			record.idempotencyKey,
			payment.id,
		);
		if (!idempotent.ok) {
			this.payments.set(payment.id, previous);
			return idempotent;
		}
		return ok(clonePayment(payment));
	}

	async reverse(
		record: Parameters<PaymentsStore["reverse"]>[0],
	): Promise<Result<Payment>> {
		const found = this.find(record.organizationId, record.paymentId);
		if (!found.ok) return found;
		const payment = found.data;
		if (payment.status !== "posted") {
			return fail("CONFLICT", "Only posted payments can be reversed");
		}
		if (payment.version !== record.expectedVersion) {
			return fail("CONFLICT", "Payment version conflict");
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
		const idempotent = this.idempotent(
			record.organizationId,
			record.idempotencyKey,
			payment.id,
		);
		if (!idempotent.ok) {
			this.payments.set(payment.id, previous);
			return idempotent;
		}
		return ok(clonePayment(payment));
	}

	async createAndPostTransfer(
		record: Parameters<PaymentsStore["createAndPostTransfer"]>[0],
	): Promise<Result<{ outgoing: Payment; incoming: Payment }>> {
		if (record.fromPaymentAccountId === record.toPaymentAccountId) {
			return failPayments(
				"CONFLICT",
				"Transfer accounts must differ",
				PAYMENTS_ERROR_TRANSFER_INVALID,
			);
		}
		const from = this.account(
			record.organizationId,
			record.fromPaymentAccountId,
		);
		if (!from.ok) return from;
		const to = this.account(record.organizationId, record.toPaymentAccountId);
		if (!to.ok) return to;
		if (!from.data.active || !to.data.active) {
			return failPayments(
				"CONFLICT",
				"Transfer requires active payment accounts",
				PAYMENTS_ERROR_TRANSFER_INVALID,
			);
		}
		if (
			from.data.currencyCode !== record.currencyCode ||
			to.data.currencyCode !== record.currencyCode
		) {
			return failPayments(
				"CONFLICT",
				"Transfer account currencies must match payment currency",
				PAYMENTS_ERROR_TRANSFER_INVALID,
			);
		}
		const group = randomUUID();
		const outgoing = this.buildDraft({
			organizationId: record.organizationId,
			code: `${record.code}-OUT`,
			normalizedCode: `${record.normalizedCode}-OUT`,
			paymentAccountId: record.fromPaymentAccountId,
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
		if (!outgoing.ok) return outgoing;
		const incoming = this.buildDraft({
			organizationId: record.organizationId,
			code: `${record.code}-IN`,
			normalizedCode: `${record.normalizedCode}-IN`,
			paymentAccountId: record.toPaymentAccountId,
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
		if (!incoming.ok) return incoming;
		const now = new Date();
		outgoing.data.linkedPaymentId = incoming.data.id;
		for (const payment of [outgoing.data, incoming.data]) {
			payment.status = "posted";
			payment.postedAt = now;
			payment.postedBy = record.actorUserId;
			payment.postIdempotencyKey = record.idempotencyKey;
			this.payments.set(payment.id, payment);
		}
		return ok({
			outgoing: clonePayment(outgoing.data),
			incoming: clonePayment(incoming.data),
		});
	}

	async postRefund(
		record: Parameters<PaymentsStore["postRefund"]>[0],
	): Promise<Result<Payment>> {
		const originalResult = this.find(
			record.organizationId,
			record.originalPaymentId,
		);
		if (!originalResult.ok) return originalResult;
		const original = originalResult.data;
		if (original.status !== "posted" || original.direction === "refund") {
			return fail("CONFLICT", "Refund requires an active posted payment");
		}
		const refunded = [...this.payments.values()]
			.filter(
				(row) =>
					row.organizationId === record.organizationId &&
					row.originalPaymentId === original.id &&
					row.status === "posted",
			)
			.reduce((total, row) => total + decimal(row.amount), 0n);
		if (refunded + decimal(record.amount) > decimal(original.amount)) {
			return failPayments(
				"CONFLICT",
				"Refund exceeds remaining refundable amount",
				PAYMENTS_ERROR_REFUND_LIMIT_EXCEEDED,
			);
		}
		const draft = this.buildDraft({
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
		if (!draft.ok) return draft;
		const refund = draft.data;
		refund.status = "posted";
		refund.postedAt = new Date();
		refund.postedBy = record.actorUserId;
		refund.postIdempotencyKey = record.createIdempotencyKey;
		this.payments.set(refund.id, refund);
		return ok(clonePayment(refund));
	}

	async markInstructionApplied(
		record: Parameters<PaymentsStore["markInstructionApplied"]>[0],
	): Promise<Result<PaymentApplicationInstruction>> {
		for (const payment of this.payments.values()) {
			const instruction = payment.applicationInstructions.find(
				(candidate) => candidate.id === record.instructionId,
			);
			if (
				instruction !== undefined &&
				payment.organizationId === record.organizationId
			) {
				if (
					decimal(record.appliedAmount) > decimal(instruction.intendedAmount)
				) {
					return fail("CONFLICT", "Applied amount exceeds intended amount");
				}
				instruction.appliedAmount = record.appliedAmount;
				instruction.status =
					decimal(record.appliedAmount) === decimal(instruction.intendedAmount)
						? "applied"
						: "partially_applied";
				instruction.updatedAt = new Date();
				return ok({ ...instruction });
			}
		}
		return failPayments(
			"NOT_FOUND",
			"Payment application instruction not found",
			PAYMENTS_ERROR_INSTRUCTION_NOT_FOUND,
		);
	}

	async markInstructionRejected(
		record: Parameters<PaymentsStore["markInstructionRejected"]>[0],
	): Promise<Result<PaymentApplicationInstruction>> {
		for (const payment of this.payments.values()) {
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
					return fail("CONFLICT", "Application instruction cannot be rejected");
				}
				instruction.status =
					record.rejectionCode === "PAYMENT_REVERSED" ? "reversed" : "rejected";
				instruction.rejectionCode = record.rejectionCode;
				instruction.updatedAt = new Date();
				return ok({ ...instruction });
			}
		}
		return failPayments(
			"NOT_FOUND",
			"Payment application instruction not found",
			PAYMENTS_ERROR_INSTRUCTION_NOT_FOUND,
		);
	}

	async getById(
		organizationId: string,
		id: string,
	): Promise<Result<Payment | null>> {
		const found = this.payments.get(id);
		return ok(
			found !== undefined && found.organizationId === organizationId
				? clonePayment(found)
				: null,
		);
	}

	async list(
		filter: Parameters<PaymentsStore["list"]>[0],
	): Promise<Result<Payment[]>> {
		const start = (filter.page - 1) * filter.pageSize;
		return ok(
			[...this.payments.values()]
				.filter((row) => row.organizationId === filter.organizationId)
				.filter(
					(row) => filter.status === undefined || row.status === filter.status,
				)
				.filter(
					(row) =>
						filter.direction === undefined ||
						row.direction === filter.direction,
				)
				.sort(
					(left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
				)
				.slice(start, start + filter.pageSize)
				.map(clonePayment),
		);
	}

	async getApplicationAvailability(
		organizationId: string,
		paymentId: string,
	): Promise<Result<PaymentApplicationAvailability>> {
		const found = this.find(organizationId, paymentId);
		if (!found.ok) return found;
		if (found.data.status !== "posted") {
			return fail(
				"CONFLICT",
				"Application availability requires a posted payment",
			);
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
		const refunded = [...this.payments.values()]
			.filter(
				(payment) =>
					payment.organizationId === organizationId &&
					payment.originalPaymentId === paymentId &&
					payment.status === "posted",
			)
			.reduce((sum, payment) => sum + decimal(payment.amount), 0n);
		return ok({
			paymentId,
			currencyCode: found.data.currencyCode,
			postedAmount: found.data.amount,
			intendedAmount: formatDecimal(intended),
			refundedAmount: formatDecimal(refunded),
			availableToApply: formatDecimal(
				decimal(found.data.amount) - intended - refunded,
			),
		});
	}
}

export function createMemoryPaymentsStore(): MemoryPaymentsStore {
	return new MemoryPaymentsStore();
}
