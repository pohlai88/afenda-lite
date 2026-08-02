import { errorResult, type Result } from "@afenda/errors";

import type {
	SupplierAllocation,
	SupplierInvoice,
} from "../../kernel/contracts/domain";
import type { PayablesEffects } from "../../kernel/contracts/effects";
import type { PostedPaymentQueryPort } from "../../kernel/contracts/ports";
import {
	type PayablesAuthorizationPort,
	requirePayablesPermission,
} from "../../kernel/execution/authorization";
import { parsePayablesInput } from "../../kernel/validation/parse-input";
import {
	applyCreditInputSchema,
	applyPaymentInputSchema,
	reversePaymentApplicationInputSchema,
} from "./allocations.schema";
import type { PayablesAllocationsStore } from "./allocations.store";

export interface AllocationOperationDeps {
	authorization?: PayablesAuthorizationPort | undefined;
	effects: PayablesEffects;
	/** Narrow invoice-lifecycle capability: load an invoice for preconditions. */
	getInvoiceById: (
		organizationId: string,
		id: string,
	) => Promise<Result<SupplierInvoice | null>>;
	postedPayment?: PostedPaymentQueryPort | undefined;
	store: PayablesAllocationsStore;
}

function permit(
	deps: AllocationOperationDeps,
	input: { organizationId: string; actorUserId: string },
): Promise<Result<void>> {
	return requirePayablesPermission(deps.authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission: "payables.manage",
	});
}

/**
 * Apply a posted Payment to a posted supplier invoice.
 * Payables owns `supplier_allocation` only — never creates Payment rows.
 */
export async function applySupplierPaymentOperation(
	input: unknown,
	deps: AllocationOperationDeps,
): Promise<Result<SupplierAllocation>> {
	const parsed = parsePayablesInput(applyPaymentInputSchema, input);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await permit(deps, parsed.data);
	if (!allowed.ok) {
		return allowed;
	}

	if (deps.postedPayment === undefined) {
		return errorResult.fail("UNAUTHORIZED");
	}

	const invoiceResult = await deps.getInvoiceById(
		parsed.data.organizationId,
		parsed.data.invoiceId,
	);
	if (!invoiceResult.ok) {
		return invoiceResult;
	}
	if (invoiceResult.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Supplier invoice not found",
		});
	}
	const invoice = invoiceResult.data;
	if (invoice.status !== "posted" || invoice.documentType !== "invoice") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Payment application requires a posted supplier invoice",
		});
	}

	const paymentBasis = await deps.postedPayment.getPostedPayment({
		organizationId: parsed.data.organizationId,
		paymentId: parsed.data.paymentId,
	});
	if (!paymentBasis.ok) {
		return paymentBasis;
	}
	if (paymentBasis.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Posted payment not found for application",
		});
	}
	if (paymentBasis.data.status !== "posted") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Payment must be posted before application",
		});
	}
	if (paymentBasis.data.currencyCode !== invoice.currencyCode) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Payment and invoice currencies must match for application",
		});
	}

	return deps.store.applyPayment({
		...parsed.data,
		effects: deps.effects,
	});
}

export async function applySupplierCreditOperation(
	input: unknown,
	deps: AllocationOperationDeps,
): Promise<Result<SupplierAllocation>> {
	const parsed = parsePayablesInput(applyCreditInputSchema, input);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await permit(deps, parsed.data);
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.applyCredit({
		...parsed.data,
		effects: deps.effects,
	});
}

export async function reverseSupplierPaymentApplicationOperation(
	input: unknown,
	deps: AllocationOperationDeps,
): Promise<Result<SupplierAllocation[]>> {
	const parsed = parsePayablesInput(
		reversePaymentApplicationInputSchema,
		input,
	);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await permit(deps, parsed.data);
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.reversePaymentApplication({
		...parsed.data,
		effects: deps.effects,
	});
}
