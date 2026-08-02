import type { Result } from "@afenda/errors";

import type { Payment } from "../../kernel/contracts/domain";
import {
	type PaymentsAuthorizationPort,
	requirePaymentsPermission,
} from "../../kernel/execution/authorization";
import type { PaymentsPermission } from "../../kernel/execution/permissions";
import {
	normalizedCode,
	parsePaymentsInput,
} from "../../kernel/validation/parse-input";
import {
	createAndPostPaymentTransferInputSchema,
	createDraftPaymentInputSchema,
	getPaymentByIdInputSchema,
	listPaymentsInputSchema,
	postPaymentInputSchema,
	postRefundInputSchema,
	reversePaymentInputSchema,
} from "./lifecycle.schema";
import type { PaymentsLifecycleStore } from "./lifecycle.store";

export interface PaymentLifecycleOperationDeps {
	authorization?: PaymentsAuthorizationPort | undefined;
	store: PaymentsLifecycleStore;
}

function permit(
	deps: PaymentLifecycleOperationDeps,
	input: { organizationId: string; actorUserId: string },
	permission: PaymentsPermission,
): Promise<Result<void>> {
	return requirePaymentsPermission(deps.authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission,
	});
}

export async function createDraftPaymentOperation(
	input: unknown,
	deps: PaymentLifecycleOperationDeps,
): Promise<Result<Payment>> {
	const parsed = parsePaymentsInput(createDraftPaymentInputSchema, input);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await permit(deps, parsed.data, "payments.payment.create");
	if (!allowed.ok) {
		return allowed;
	}
	const { data } = parsed;
	return deps.store.createDraft({
		organizationId: data.organizationId,
		code: data.code,
		normalizedCode: normalizedCode(data.code),
		paymentAccountId: data.paymentAccountId,
		direction: data.direction,
		purpose: data.purpose,
		counterpartyId: data.counterpartyId ?? null,
		counterpartySnapshot: data.counterpartySnapshot ?? null,
		transferGroupId: null,
		linkedPaymentId: null,
		originalPaymentId: null,
		refundSource: null,
		currencyCode: data.currencyCode,
		amount: data.amount,
		reference: data.reference ?? null,
		createIdempotencyKey: data.idempotencyKey,
		actorUserId: data.actorUserId,
		correlationId: data.correlationId,
	});
}

export async function postPaymentOperation(
	input: unknown,
	deps: PaymentLifecycleOperationDeps,
): Promise<Result<Payment>> {
	const parsed = parsePaymentsInput(postPaymentInputSchema, input);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await permit(deps, parsed.data, "payments.payment.post");
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.post(parsed.data);
}

export async function reversePaymentOperation(
	input: unknown,
	deps: PaymentLifecycleOperationDeps,
): Promise<Result<Payment>> {
	const parsed = parsePaymentsInput(reversePaymentInputSchema, input);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await permit(deps, parsed.data, "payments.payment.reverse");
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.reverse(parsed.data);
}

export async function createAndPostPaymentTransferOperation(
	input: unknown,
	deps: PaymentLifecycleOperationDeps,
): Promise<Result<{ outgoing: Payment; incoming: Payment }>> {
	const parsed = parsePaymentsInput(
		createAndPostPaymentTransferInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const create = await permit(deps, parsed.data, "payments.transfer.create");
	if (!create.ok) {
		return create;
	}
	const post = await permit(deps, parsed.data, "payments.transfer.post");
	if (!post.ok) {
		return post;
	}
	return deps.store.createAndPostTransfer({
		...parsed.data,
		normalizedCode: normalizedCode(parsed.data.code),
		reference: parsed.data.reference ?? null,
	});
}

export async function postRefundOperation(
	input: unknown,
	deps: PaymentLifecycleOperationDeps,
): Promise<Result<Payment>> {
	const parsed = parsePaymentsInput(postRefundInputSchema, input);
	if (!parsed.ok) {
		return parsed;
	}
	const create = await permit(deps, parsed.data, "payments.refund.create");
	if (!create.ok) {
		return create;
	}
	const post = await permit(deps, parsed.data, "payments.refund.post");
	if (!post.ok) {
		return post;
	}
	return deps.store.postRefund({
		organizationId: parsed.data.organizationId,
		code: parsed.data.code,
		normalizedCode: normalizedCode(parsed.data.code),
		originalPaymentId: parsed.data.originalPaymentId,
		paymentAccountId: parsed.data.paymentAccountId,
		refundSource: parsed.data.refundSource,
		amount: parsed.data.amount,
		reference: parsed.data.reference ?? null,
		createIdempotencyKey: parsed.data.idempotencyKey,
		actorUserId: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
	});
}

export async function getPaymentByIdOperation(
	input: unknown,
	deps: PaymentLifecycleOperationDeps,
): Promise<Result<Payment | null>> {
	const parsed = parsePaymentsInput(getPaymentByIdInputSchema, input);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await permit(deps, parsed.data, "payments.payment.read");
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.getById(parsed.data.organizationId, parsed.data.id);
}

export async function listPaymentsOperation(
	input: unknown,
	deps: PaymentLifecycleOperationDeps,
): Promise<Result<Payment[]>> {
	const parsed = parsePaymentsInput(listPaymentsInputSchema, input);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await permit(deps, parsed.data, "payments.payment.read");
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.list(parsed.data);
}
