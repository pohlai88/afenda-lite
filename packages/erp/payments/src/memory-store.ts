import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";

import type {
	Payment,
	PaymentAllocation,
	PaymentCreateRecord,
	PaymentRefundRecord,
	PaymentsStore,
} from "./model";

const SCALE = 1_000_000n;

function decimal(value: string): bigint {
	const [whole = "0", fraction = ""] = value.split(".");
	return BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, "0").slice(0, 6));
}

function clonePayment(payment: Payment): Payment {
	return {
		...payment,
		allocations: payment.allocations.map((allocation) => ({ ...allocation })),
		reversal: payment.reversal === null ? null : { ...payment.reversal },
	};
}

function payload(payment: Payment, actorUserId: string, correlationId: string) {
	return {
		organizationId: payment.organizationId,
		entityId: payment.id,
		direction: payment.direction,
		counterpartyId: payment.counterpartyId,
		amount: payment.amount,
		currencyCode: payment.currencyCode,
		allocations: payment.allocations.map((allocation) => ({
			targetType: allocation.targetType,
			targetId: allocation.targetId,
			amount: allocation.amount,
		})),
		actorId: actorUserId,
		correlationId,
	};
}

export class MemoryPaymentsStore implements PaymentsStore {
	private readonly payments = new Map<string, Payment>();

	private find(organizationId: string, paymentId: string): Result<Payment> {
		const found = this.payments.get(paymentId);
		return found === undefined || found.organizationId !== organizationId
			? fail("NOT_FOUND", "Payment not found")
			: ok(found);
	}

	private codeAvailable(
		organizationId: string,
		normalizedCode: string,
	): boolean {
		for (const row of this.payments.values()) {
			if (
				row.organizationId === organizationId &&
				row.normalizedCode === normalizedCode
			) {
				return false;
			}
		}
		return true;
	}

	private draft(record: PaymentCreateRecord): Result<Payment> {
		if (!this.codeAvailable(record.organizationId, record.normalizedCode)) {
			return fail("CONFLICT", "Payment code already exists");
		}
		const now = new Date();
		return ok({
			id: randomUUID(),
			organizationId: record.organizationId,
			code: record.code,
			normalizedCode: record.normalizedCode,
			direction: record.direction,
			status: "draft",
			counterpartyId: record.counterpartyId,
			originalPaymentId: null,
			currencyCode: record.currencyCode,
			amount: record.amount,
			reference: record.reference,
			version: 1,
			createdBy: record.actorUserId,
			updatedBy: record.actorUserId,
			postedAt: null,
			postedBy: null,
			reversedAt: null,
			reversedBy: null,
			createdAt: now,
			updatedAt: now,
			allocations: [],
			reversal: null,
		});
	}

	async createDraft(record: PaymentCreateRecord): Promise<Result<Payment>> {
		const created = this.draft(record);
		if (!created.ok) return created;
		this.payments.set(created.data.id, created.data);
		const emitted = await record.effects.emit({
			type: "payments.payment.created.v1",
			organizationId: record.organizationId,
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
			payload: payload(created.data, record.actorUserId, record.correlationId),
		});
		if (!emitted.ok) {
			this.payments.delete(created.data.id);
			return emitted;
		}
		return ok(clonePayment(created.data));
	}

	async addAllocation(
		record: Parameters<PaymentsStore["addAllocation"]>[0],
	): Promise<Result<PaymentAllocation>> {
		const found = this.find(record.organizationId, record.paymentId);
		if (!found.ok) return found;
		const payment = found.data;
		if (payment.status !== "draft") {
			return fail("CONFLICT", "Allocations require a draft payment");
		}
		const allowedTarget =
			(payment.direction === "receipt" && record.targetType === "receivable") ||
			(payment.direction === "disbursement" && record.targetType === "payable");
		if (!allowedTarget) {
			return fail(
				"CONFLICT",
				"Allocation target is incompatible with payment direction",
			);
		}
		const allocated = payment.allocations.reduce(
			(total, allocation) => total + decimal(allocation.amount),
			0n,
		);
		if (allocated + decimal(record.amount) > decimal(payment.amount)) {
			return fail("CONFLICT", "Allocation exceeds payment amount");
		}
		const allocation: PaymentAllocation = {
			id: randomUUID(),
			organizationId: record.organizationId,
			paymentId: payment.id,
			targetType: record.targetType,
			targetId: record.targetId,
			amount: record.amount,
			createdBy: record.actorUserId,
			createdAt: new Date(),
		};
		payment.allocations.push(allocation);
		payment.version += 1;
		payment.updatedBy = record.actorUserId;
		payment.updatedAt = allocation.createdAt;
		return ok({ ...allocation });
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
		payment.postedAt = now;
		payment.postedBy = record.actorUserId;
		payment.updatedAt = now;
		payment.updatedBy = record.actorUserId;
		payment.version += 1;
		const emitted = await record.effects.emit({
			type: "payments.payment.posted.v1",
			organizationId: payment.organizationId,
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
			payload: payload(payment, record.actorUserId, record.correlationId),
		});
		if (!emitted.ok) {
			this.payments.set(payment.id, previous);
			return emitted;
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
		payment.reversal = reversal;
		payment.reversedAt = now;
		payment.reversedBy = record.actorUserId;
		payment.updatedAt = now;
		payment.updatedBy = record.actorUserId;
		payment.version += 1;
		const emitted = await record.effects.emit({
			type: "payments.payment.reversed.v1",
			organizationId: payment.organizationId,
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
			payload: {
				...payload(payment, record.actorUserId, record.correlationId),
				reversalId: reversal.id,
				reason: record.reason,
			},
		});
		if (!emitted.ok) {
			this.payments.set(payment.id, previous);
			return emitted;
		}
		return ok(clonePayment(payment));
	}

	async postRefund(record: PaymentRefundRecord): Promise<Result<Payment>> {
		const originalResult = this.find(
			record.organizationId,
			record.originalPaymentId,
		);
		if (!originalResult.ok) return originalResult;
		const original = originalResult.data;
		if (original.status !== "posted" || original.direction === "refund") {
			return fail("CONFLICT", "Refund requires an active posted payment");
		}
		if (!this.codeAvailable(record.organizationId, record.normalizedCode)) {
			return fail("CONFLICT", "Payment code already exists");
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
			return fail("CONFLICT", "Refund exceeds remaining refundable amount");
		}
		const now = new Date();
		const refund: Payment = {
			id: randomUUID(),
			organizationId: record.organizationId,
			code: record.code,
			normalizedCode: record.normalizedCode,
			direction: "refund",
			status: "posted",
			counterpartyId: original.counterpartyId,
			originalPaymentId: original.id,
			currencyCode: original.currencyCode,
			amount: record.amount,
			reference: record.reference,
			version: 1,
			createdBy: record.actorUserId,
			updatedBy: record.actorUserId,
			postedAt: now,
			postedBy: record.actorUserId,
			reversedAt: null,
			reversedBy: null,
			createdAt: now,
			updatedAt: now,
			allocations: [],
			reversal: null,
		};
		this.payments.set(refund.id, refund);
		const emitted = await record.effects.emit({
			type: "payments.refund.posted.v1",
			organizationId: refund.organizationId,
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
			payload: {
				...payload(refund, record.actorUserId, record.correlationId),
				originalPaymentId: original.id,
			},
		});
		if (!emitted.ok) {
			this.payments.delete(refund.id);
			return emitted;
		}
		return ok(clonePayment(refund));
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
}

export function createMemoryPaymentsStore(): MemoryPaymentsStore {
	return new MemoryPaymentsStore();
}
