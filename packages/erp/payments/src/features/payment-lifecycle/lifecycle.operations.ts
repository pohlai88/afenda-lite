import { errorResult, type Result } from "@afenda/errors";

import type {
	Payment,
	PaymentAccountKind,
	PaymentDeductionEffect,
	PaymentDeductionKind,
	PaymentInstrument,
	PaymentMethod,
	PaymentMethodSnapshot,
} from "../../kernel/contracts/domain";
import {
	type PaymentsAuthorizationPort,
	requirePaymentsPermission,
} from "../../kernel/execution/authorization";
import type { PaymentsPermission } from "../../kernel/execution/permissions";
import { decimal } from "../../kernel/money";
import {
	normalizedCode,
	parsePaymentsInput,
} from "../../kernel/validation/parse-input";
import type { PaymentAccountsStore } from "../payment-accounts/accounts.store";
import type { PaymentMethodsStore } from "../payment-methods/methods.store";
import { deriveFunctionalAmount, validateFxContext } from "./fx-policy";
import {
	createAndPostPaymentTransferInputSchema,
	createDraftPaymentInputSchema,
	getPaymentByIdInputSchema,
	listPaymentsInputSchema,
	postPaymentInputSchema,
	postRefundInputSchema,
	reversePaymentInputSchema,
	updateInstrumentClearanceInputSchema,
} from "./lifecycle.schema";
import type {
	PaymentDeductionInput,
	PaymentsLifecycleStore,
} from "./lifecycle.store";

export interface PaymentLifecycleOperationDeps {
	accounts: PaymentAccountsStore;
	authorization?: PaymentsAuthorizationPort | undefined;
	methods: PaymentMethodsStore;
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

async function resolveActiveMethod(
	deps: PaymentLifecycleOperationDeps,
	organizationId: string,
	paymentMethodId: string,
): Promise<Result<PaymentMethod>> {
	const method = await deps.methods.getPaymentMethodById(
		organizationId,
		paymentMethodId,
	);
	if (!method.ok) {
		return method;
	}
	if (method.data === null || !method.data.active) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Payment method not found or inactive",
		});
	}
	return errorResult.ok(method.data);
}

function validateMethodCompatibility(
	method: PaymentMethod,
	input: {
		accountKind: PaymentAccountKind;
		instrument: PaymentInstrument | null;
	},
): Result<void> {
	if (!method.allowedAccountKinds.includes(input.accountKind)) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Payment account kind is not allowed for this method",
		});
	}
	if (
		method.instrumentRequirement === "required" &&
		input.instrument === null
	) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "This payment method requires instrument details",
		});
	}
	if (
		method.instrumentRequirement === "forbidden" &&
		input.instrument !== null
	) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "This payment method forbids instrument details",
		});
	}
	if (
		input.instrument !== null &&
		!method.allowedInstrumentKinds.includes(input.instrument.kind)
	) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Instrument kind is not allowed for this method",
		});
	}
	return errorResult.ok(undefined);
}

function methodSnapshotOf(method: PaymentMethod): PaymentMethodSnapshot {
	return {
		paymentMethodId: method.id,
		code: method.code,
		kind: method.kind,
	};
}

const DEFAULT_DEDUCTION_EFFECTS: Readonly<
	Record<PaymentDeductionKind, PaymentDeductionEffect | null>
> = {
	bank_charge: "reduces_cash_movement",
	withholding: "reduces_cash_movement",
	write_off: "reduces_cash_movement",
	rounding: "reduces_application_only",
	other: null,
};

/**
 * Applies per-kind default effects, assigns 1-based line numbers, and
 * enforces per-effect totals against the gross amount.
 */
function resolveDeductions(
	lines: readonly {
		kind: PaymentDeductionKind;
		effect?: PaymentDeductionEffect | undefined;
		amount: string;
		accountingPurposeCode: string;
		description?: string | null | undefined;
	}[],
	grossAmount: string,
): Result<PaymentDeductionInput[]> {
	const resolved: PaymentDeductionInput[] = [];
	const effectTotals = new Map<PaymentDeductionEffect, bigint>();
	for (const [index, line] of lines.entries()) {
		const effect = line.effect ?? DEFAULT_DEDUCTION_EFFECTS[line.kind];
		if (effect === null) {
			return errorResult.fail("VALIDATION_ERROR", {
				publicMessage: `Deduction kind "${line.kind}" requires an explicit effect`,
			});
		}
		if (decimal(line.amount) <= 0n) {
			return errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Deduction amounts must be strictly positive",
			});
		}
		effectTotals.set(
			effect,
			(effectTotals.get(effect) ?? 0n) + decimal(line.amount),
		);
		resolved.push({
			lineNo: index + 1,
			kind: line.kind,
			effect,
			amount: line.amount,
			accountingPurposeCode: line.accountingPurposeCode,
			description: line.description ?? null,
		});
	}
	const gross = decimal(grossAmount);
	for (const [effect, total] of effectTotals) {
		if (effect !== "informational" && total > gross) {
			return errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Deductions exceed the gross payment amount",
			});
		}
	}
	return errorResult.ok(resolved);
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
	const account = await deps.accounts.getPaymentAccountById(
		data.organizationId,
		data.paymentAccountId,
	);
	if (!account.ok) {
		return account;
	}
	if (account.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Payment account not found",
		});
	}
	const method = await resolveActiveMethod(
		deps,
		data.organizationId,
		data.paymentMethodId,
	);
	if (!method.ok) {
		return method;
	}
	const instrument = data.instrument ?? null;
	const compat = validateMethodCompatibility(method.data, {
		accountKind: account.data.kind,
		instrument,
	});
	if (!compat.ok) {
		return compat;
	}
	// A payment without a context is same-currency by construction; the
	// functional currency is the payment currency itself (presence invariant).
	const fx = validateFxContext({
		amount: data.amount,
		currencyCode: data.currencyCode,
		fxContext: data.fxContext ?? null,
	});
	if (!fx.ok) {
		return fx;
	}
	const deductions = resolveDeductions(data.deductions, data.amount);
	if (!deductions.ok) {
		return deductions;
	}
	return deps.store.createDraft({
		organizationId: data.organizationId,
		code: data.code,
		normalizedCode: normalizedCode(data.code),
		paymentAccountId: data.paymentAccountId,
		paymentMethodId: data.paymentMethodId,
		instrument,
		fxContext: fx.data,
		functionalAmount: deriveFunctionalAmount(data.amount, fx.data),
		deductions: deductions.data,
		methodSnapshot: null,
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
	const { data } = parsed;
	const payment = await deps.store.getById(data.organizationId, data.paymentId);
	if (!payment.ok) {
		return payment;
	}
	if (payment.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Payment not found",
		});
	}
	const method = await resolveActiveMethod(
		deps,
		data.organizationId,
		payment.data.paymentMethodId,
	);
	if (!method.ok) {
		return method;
	}
	const account = await deps.accounts.getPaymentAccountById(
		data.organizationId,
		payment.data.paymentAccountId,
	);
	if (!account.ok) {
		return account;
	}
	if (account.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Payment account not found",
		});
	}
	const compat = validateMethodCompatibility(method.data, {
		accountKind: account.data.kind,
		instrument: payment.data.instrument,
	});
	if (!compat.ok) {
		return compat;
	}
	return deps.store.post({
		organizationId: data.organizationId,
		paymentId: data.paymentId,
		expectedVersion: data.expectedVersion,
		methodSnapshot: methodSnapshotOf(method.data),
		actorUserId: data.actorUserId,
		correlationId: data.correlationId,
		idempotencyKey: data.idempotencyKey,
	});
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
	const { data } = parsed;
	const method = await resolveActiveMethod(
		deps,
		data.organizationId,
		data.paymentMethodId,
	);
	if (!method.ok) {
		return method;
	}
	const accounts = await Promise.all([
		deps.accounts.getPaymentAccountById(
			data.organizationId,
			data.fromPaymentAccountId,
		),
		deps.accounts.getPaymentAccountById(
			data.organizationId,
			data.toPaymentAccountId,
		),
	]);
	for (const account of accounts) {
		if (!account.ok) {
			return account;
		}
		if (account.data === null) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "Payment account not found",
			});
		}
		const compat = validateMethodCompatibility(method.data, {
			accountKind: account.data.kind,
			instrument: null,
		});
		if (!compat.ok) {
			return compat;
		}
	}
	return deps.store.createAndPostTransfer({
		organizationId: data.organizationId,
		code: data.code,
		normalizedCode: normalizedCode(data.code),
		fromPaymentAccountId: data.fromPaymentAccountId,
		toPaymentAccountId: data.toPaymentAccountId,
		paymentMethodId: data.paymentMethodId,
		methodSnapshot: methodSnapshotOf(method.data),
		amount: data.amount,
		currencyCode: data.currencyCode,
		actorUserId: data.actorUserId,
		correlationId: data.correlationId,
		idempotencyKey: data.idempotencyKey,
		reference: data.reference ?? null,
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
	const { data } = parsed;
	const account = await deps.accounts.getPaymentAccountById(
		data.organizationId,
		data.paymentAccountId,
	);
	if (!account.ok) {
		return account;
	}
	if (account.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Payment account not found",
		});
	}
	const method = await resolveActiveMethod(
		deps,
		data.organizationId,
		data.paymentMethodId,
	);
	if (!method.ok) {
		return method;
	}
	const instrument = data.instrument ?? null;
	const compat = validateMethodCompatibility(method.data, {
		accountKind: account.data.kind,
		instrument,
	});
	if (!compat.ok) {
		return compat;
	}
	const fx = validateFxContext({
		amount: data.amount,
		currencyCode: account.data.currencyCode,
		fxContext: data.fxContext ?? null,
	});
	if (!fx.ok) {
		return fx;
	}
	const deductions = resolveDeductions(data.deductions, data.amount);
	if (!deductions.ok) {
		return deductions;
	}
	return deps.store.postRefund({
		organizationId: data.organizationId,
		code: data.code,
		normalizedCode: normalizedCode(data.code),
		originalPaymentId: data.originalPaymentId,
		paymentAccountId: data.paymentAccountId,
		paymentMethodId: data.paymentMethodId,
		instrument,
		fxContext: fx.data,
		functionalAmount: deriveFunctionalAmount(data.amount, fx.data),
		deductions: deductions.data,
		methodSnapshot: methodSnapshotOf(method.data),
		refundSource: data.refundSource,
		amount: data.amount,
		reference: data.reference ?? null,
		createIdempotencyKey: data.idempotencyKey,
		actorUserId: data.actorUserId,
		correlationId: data.correlationId,
	});
}

export async function updateInstrumentClearanceOperation(
	input: unknown,
	deps: PaymentLifecycleOperationDeps,
): Promise<Result<Payment>> {
	const parsed = parsePaymentsInput(
		updateInstrumentClearanceInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await permit(deps, parsed.data, "payments.payment.update");
	if (!allowed.ok) {
		return allowed;
	}
	const { data } = parsed;
	return deps.store.updateInstrumentClearance({
		organizationId: data.organizationId,
		paymentId: data.paymentId,
		expectedVersion: data.expectedVersion,
		status: data.status,
		clearanceDate: data.clearanceDate ?? null,
		settlementReference: data.settlementReference ?? null,
		reason: data.reason ?? null,
		actorUserId: data.actorUserId,
		correlationId: data.correlationId,
		idempotencyKey: data.idempotencyKey,
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
