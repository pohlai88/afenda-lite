import "server-only";

import { fail, ok, type Result } from "@afenda/errors/result";
import type { z } from "zod";

import { requirePaymentsPermission } from "./authorization";
import type {
	Payment,
	PaymentAccount,
	PaymentApplicationAvailability,
	PaymentApplicationInstruction,
	PaymentsCommandOptions,
} from "./model";
import { resolvePaymentsStore } from "./resolve-store";
import {
	addPaymentApplicationInstructionInputSchema,
	createAndPostPaymentTransferInputSchema,
	createDraftPaymentInputSchema,
	createPaymentAccountInputSchema,
	getPaymentApplicationAvailabilityInputSchema,
	getPaymentByIdInputSchema,
	listPaymentAccountsInputSchema,
	listPaymentsInputSchema,
	markApplicationInstructionAppliedInputSchema,
	markApplicationInstructionRejectedInputSchema,
	postPaymentInputSchema,
	postRefundInputSchema,
	reversePaymentInputSchema,
} from "./schemas";

export type { PaymentsAuthorizationPort } from "./authorization";
export * from "./error-codes";
export type {
	Payment,
	PaymentAccount,
	PaymentAccountKind,
	PaymentApplicationAvailability,
	PaymentApplicationInstruction,
	PaymentDirection,
	PaymentPurpose,
	PaymentStatus,
	PaymentsCommandOptions,
	PaymentsEffects,
	PaymentsStore,
	RefundSource,
} from "./model";
export * from "./permissions";
export { reconcilePayments } from "./reconcile";
export * from "./schemas";

const parse = <T>(
	schema: z.ZodType<T>,
	input: unknown,
	message: string,
): Result<T> => {
	const result = schema.safeParse(input);
	return result.success
		? ok(result.data)
		: fail("BAD_REQUEST", message, {
				fieldErrors: result.error.flatten().fieldErrors,
			});
};

const normalized = (value: string) => value.trim().toUpperCase();

async function permit(
	options: PaymentsCommandOptions,
	input: { organizationId: string; actorUserId: string },
	permission: Parameters<typeof requirePaymentsPermission>[1]["permission"],
) {
	return requirePaymentsPermission(options.authorization, {
		...input,
		permission,
	});
}

export async function createPaymentAccount(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<PaymentAccount>> {
	const parsed = parse(
		createPaymentAccountInputSchema,
		input,
		"Invalid payment-account input",
	);
	if (!parsed.ok) return parsed;
	const allowed = await permit(options, parsed.data, "payments.account.manage");
	if (!allowed.ok) return allowed;
	return resolvePaymentsStore(options.store).createPaymentAccount({
		organizationId: parsed.data.organizationId,
		code: parsed.data.code,
		normalizedCode: normalized(parsed.data.code),
		name: parsed.data.name,
		kind: parsed.data.kind,
		currencyCode: parsed.data.currencyCode,
		active: parsed.data.active ?? true,
		createdBy: parsed.data.actorUserId,
	});
}

export async function listPaymentAccounts(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<PaymentAccount[]>> {
	const parsed = parse(
		listPaymentAccountsInputSchema,
		input,
		"Invalid payment-account list input",
	);
	if (!parsed.ok) return parsed;
	const allowed = await permit(options, parsed.data, "payments.account.read");
	if (!allowed.ok) return allowed;
	return resolvePaymentsStore(options.store).listPaymentAccounts(
		parsed.data.organizationId,
	);
}

export async function createDraftPayment(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<Payment>> {
	const parsed = parse(
		createDraftPaymentInputSchema,
		input,
		"Invalid payment create input",
	);
	if (!parsed.ok) return parsed;
	const allowed = await permit(options, parsed.data, "payments.payment.create");
	if (!allowed.ok) return allowed;
	const data = parsed.data;
	return resolvePaymentsStore(options.store).createDraft({
		organizationId: data.organizationId,
		code: data.code,
		normalizedCode: normalized(data.code),
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

export async function addPaymentApplicationInstruction(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<PaymentApplicationInstruction>> {
	const parsed = parse(
		addPaymentApplicationInstructionInputSchema,
		input,
		"Invalid payment application instruction input",
	);
	if (!parsed.ok) return parsed;
	const allowed = await permit(
		options,
		parsed.data,
		"payments.application_instruction.manage",
	);
	if (!allowed.ok) return allowed;
	return resolvePaymentsStore(options.store).addApplicationInstruction({
		organizationId: parsed.data.organizationId,
		paymentId: parsed.data.paymentId,
		targetModule: parsed.data.targetModule,
		targetDocumentType: parsed.data.targetDocumentType,
		targetDocumentId: parsed.data.targetDocumentId,
		intendedAmount: parsed.data.intendedAmount,
		currencyCode: parsed.data.currencyCode,
		createdBy: parsed.data.actorUserId,
		idempotencyKey: parsed.data.idempotencyKey,
		actorUserId: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
	});
}

export async function postPayment(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<Payment>> {
	const parsed = parse(
		postPaymentInputSchema,
		input,
		"Invalid payment post input",
	);
	if (!parsed.ok) return parsed;
	const allowed = await permit(options, parsed.data, "payments.payment.post");
	if (!allowed.ok) return allowed;
	return resolvePaymentsStore(options.store).post(parsed.data);
}

export async function reversePayment(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<Payment>> {
	const parsed = parse(
		reversePaymentInputSchema,
		input,
		"Invalid payment reversal input",
	);
	if (!parsed.ok) return parsed;
	const allowed = await permit(
		options,
		parsed.data,
		"payments.payment.reverse",
	);
	if (!allowed.ok) return allowed;
	return resolvePaymentsStore(options.store).reverse(parsed.data);
}

export async function createAndPostPaymentTransfer(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<{ outgoing: Payment; incoming: Payment }>> {
	const parsed = parse(
		createAndPostPaymentTransferInputSchema,
		input,
		"Invalid payment transfer input",
	);
	if (!parsed.ok) return parsed;
	const create = await permit(options, parsed.data, "payments.transfer.create");
	if (!create.ok) return create;
	const post = await permit(options, parsed.data, "payments.transfer.post");
	if (!post.ok) return post;
	return resolvePaymentsStore(options.store).createAndPostTransfer({
		...parsed.data,
		normalizedCode: normalized(parsed.data.code),
		reference: parsed.data.reference ?? null,
	});
}

export async function postRefund(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<Payment>> {
	const parsed = parse(
		postRefundInputSchema,
		input,
		"Invalid payment refund input",
	);
	if (!parsed.ok) return parsed;
	const create = await permit(options, parsed.data, "payments.refund.create");
	if (!create.ok) return create;
	const post = await permit(options, parsed.data, "payments.refund.post");
	if (!post.ok) return post;
	return resolvePaymentsStore(options.store).postRefund({
		organizationId: parsed.data.organizationId,
		code: parsed.data.code,
		normalizedCode: normalized(parsed.data.code),
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

export async function markApplicationInstructionApplied(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<PaymentApplicationInstruction>> {
	const parsed = parse(
		markApplicationInstructionAppliedInputSchema,
		input,
		"Invalid application instruction input",
	);
	if (!parsed.ok) return parsed;
	const allowed = await permit(
		options,
		parsed.data,
		"payments.application_instruction.manage",
	);
	if (!allowed.ok) return allowed;
	return resolvePaymentsStore(options.store).markInstructionApplied(
		parsed.data,
	);
}

export async function markApplicationInstructionRejected(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<PaymentApplicationInstruction>> {
	const parsed = parse(
		markApplicationInstructionRejectedInputSchema,
		input,
		"Invalid application instruction input",
	);
	if (!parsed.ok) return parsed;
	const allowed = await permit(
		options,
		parsed.data,
		"payments.application_instruction.manage",
	);
	if (!allowed.ok) return allowed;
	return resolvePaymentsStore(options.store).markInstructionRejected(
		parsed.data,
	);
}

export async function getPaymentById(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<Payment | null>> {
	const parsed = parse(
		getPaymentByIdInputSchema,
		input,
		"Invalid payment get input",
	);
	if (!parsed.ok) return parsed;
	const allowed = await permit(options, parsed.data, "payments.payment.read");
	if (!allowed.ok) return allowed;
	return resolvePaymentsStore(options.store).getById(
		parsed.data.organizationId,
		parsed.data.id,
	);
}

export async function listPayments(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<Payment[]>> {
	const parsed = parse(
		listPaymentsInputSchema,
		input,
		"Invalid payment list input",
	);
	if (!parsed.ok) return parsed;
	const allowed = await permit(options, parsed.data, "payments.payment.read");
	if (!allowed.ok) return allowed;
	return resolvePaymentsStore(options.store).list(parsed.data);
}

export async function getPaymentApplicationAvailability(
	input: unknown,
	options: PaymentsCommandOptions = {},
): Promise<Result<PaymentApplicationAvailability>> {
	const parsed = parse(
		getPaymentApplicationAvailabilityInputSchema,
		input,
		"Invalid payment availability input",
	);
	if (!parsed.ok) return parsed;
	const allowed = await permit(
		options,
		parsed.data,
		"payments.availability.read",
	);
	if (!allowed.ok) return allowed;
	return resolvePaymentsStore(options.store).getApplicationAvailability(
		parsed.data.organizationId,
		parsed.data.paymentId,
	);
}
