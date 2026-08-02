import { errorResult, type Result } from "@afenda/errors";

import type {
	SupplierInvoice,
	SupplierInvoiceLine,
} from "../../kernel/contracts/domain";
import type { PayablesEffects } from "../../kernel/contracts/effects";
import type {
	GoodsReceiptMatchQueryPort,
	PurchaseOrderMatchQueryPort,
} from "../../kernel/contracts/ports";
import {
	type PayablesAuthorizationPort,
	requirePayablesPermission,
} from "../../kernel/execution/authorization";
import {
	normalizedCode,
	parsePayablesInput,
} from "../../kernel/validation/parse-input";
import {
	addInvoiceLineInputSchema,
	createInvoiceInputSchema,
	getInvoiceInputSchema,
	listInvoicesInputSchema,
	matchInvoiceInputSchema,
	versionedInvoiceInputSchema,
} from "./invoice-lifecycle.schema";
import type { PayablesInvoiceLifecycleStore } from "./invoice-lifecycle.store";
import { evaluateThreeWayMatch } from "./three-way-match";

export interface InvoiceLifecycleOperationDeps {
	authorization?: PayablesAuthorizationPort | undefined;
	effects: PayablesEffects;
	goodsReceiptMatch?: GoodsReceiptMatchQueryPort | undefined;
	purchaseOrderMatch?: PurchaseOrderMatchQueryPort | undefined;
	store: PayablesInvoiceLifecycleStore;
}

function permit(
	deps: InvoiceLifecycleOperationDeps,
	input: { organizationId: string; actorUserId: string },
	permission: "payables.read" | "payables.manage",
): Promise<Result<void>> {
	return requirePayablesPermission(deps.authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission,
	});
}

export async function createDraftSupplierInvoiceOperation(
	input: unknown,
	deps: InvoiceLifecycleOperationDeps,
): Promise<Result<SupplierInvoice>> {
	const parsed = parsePayablesInput(createInvoiceInputSchema, input);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await permit(deps, parsed.data, "payables.manage");
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.createInvoice({
		...parsed.data,
		documentType: "invoice",
		effects: deps.effects,
		normalizedCode: normalizedCode(parsed.data.code),
	});
}

export async function addSupplierInvoiceLineOperation(
	input: unknown,
	deps: InvoiceLifecycleOperationDeps,
): Promise<Result<SupplierInvoiceLine>> {
	const parsed = parsePayablesInput(addInvoiceLineInputSchema, input);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await permit(deps, parsed.data, "payables.manage");
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.addLine(parsed.data);
}

export async function matchSupplierInvoiceOperation(
	input: unknown,
	deps: InvoiceLifecycleOperationDeps,
): Promise<Result<SupplierInvoice>> {
	const parsed = parsePayablesInput(matchInvoiceInputSchema, input);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await permit(deps, parsed.data, "payables.manage");
	if (!allowed.ok) {
		return allowed;
	}

	if (
		deps.purchaseOrderMatch === undefined ||
		deps.goodsReceiptMatch === undefined
	) {
		return errorResult.fail("UNAUTHORIZED");
	}

	const invoiceResult = await deps.store.getById(
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
	if (invoice.version !== parsed.data.expectedVersion) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Supplier invoice version conflict",
		});
	}
	if (invoice.status !== "draft" || invoice.documentType !== "invoice") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Only draft supplier invoices can be matched",
		});
	}
	if (invoice.lines.length === 0) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Cannot match an invoice without lines",
		});
	}
	if (Number(invoice.totalAmount) <= 0) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Cannot match an invoice without a positive total",
		});
	}

	const poBasis = await deps.purchaseOrderMatch.getPurchaseOrderMatchBasis({
		organizationId: parsed.data.organizationId,
		purchaseOrderId: parsed.data.purchaseOrderId,
	});
	if (!poBasis.ok) {
		return poBasis;
	}
	if (poBasis.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Purchase order not found for matching",
		});
	}

	const grBasis = await deps.goodsReceiptMatch.getGoodsReceiptMatchBasis({
		goodsReceiptId: parsed.data.goodsReceiptId,
		organizationId: parsed.data.organizationId,
	});
	if (!grBasis.ok) {
		return grBasis;
	}
	if (grBasis.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Goods receipt not found for matching",
		});
	}

	const matchEvaluation = evaluateThreeWayMatch({
		goodsReceipt: grBasis.data,
		invoice,
		purchaseOrder: poBasis.data,
	});
	if (!matchEvaluation.ok) {
		return matchEvaluation;
	}

	return deps.store.matchInvoice({
		...parsed.data,
		effects: deps.effects,
		evidence: matchEvaluation.data.evidence,
		goodsReceiptVersion: grBasis.data.version,
		matchStatus: matchEvaluation.data.status,
		purchaseOrderVersion: poBasis.data.version,
	});
}

export async function postSupplierInvoiceOperation(
	input: unknown,
	deps: InvoiceLifecycleOperationDeps,
): Promise<Result<SupplierInvoice>> {
	const parsed = parsePayablesInput(versionedInvoiceInputSchema, input);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await permit(deps, parsed.data, "payables.manage");
	if (!allowed.ok) {
		return allowed;
	}
	const current = await deps.store.getById(
		parsed.data.organizationId,
		parsed.data.invoiceId,
	);
	if (!current.ok) {
		return current;
	}
	if (current.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Supplier invoice not found",
		});
	}
	const match = current.data.matchResult;
	if (match === null || match.result === "exception") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Supplier invoice requires a successful three-way match",
		});
	}
	if (
		deps.purchaseOrderMatch === undefined ||
		deps.goodsReceiptMatch === undefined
	) {
		return errorResult.fail("UNAUTHORIZED");
	}
	const [purchaseOrder, goodsReceipt] = await Promise.all([
		deps.purchaseOrderMatch.getPurchaseOrderMatchBasis({
			organizationId: parsed.data.organizationId,
			purchaseOrderId: match.purchaseOrderId,
		}),
		deps.goodsReceiptMatch.getGoodsReceiptMatchBasis({
			goodsReceiptId: match.goodsReceiptId,
			organizationId: parsed.data.organizationId,
		}),
	]);
	if (!purchaseOrder.ok) {
		return purchaseOrder;
	}
	if (!goodsReceipt.ok) {
		return goodsReceipt;
	}
	if (
		purchaseOrder.data === null ||
		goodsReceipt.data === null ||
		purchaseOrder.data.version !== match.purchaseOrderVersion ||
		goodsReceipt.data.version !== match.goodsReceiptVersion
	) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Three-way match evidence is stale; rematch before posting",
		});
	}
	return deps.store.postInvoice({
		...parsed.data,
		effects: deps.effects,
	});
}

export async function cancelSupplierInvoiceOperation(
	input: unknown,
	deps: InvoiceLifecycleOperationDeps,
): Promise<Result<SupplierInvoice>> {
	const parsed = parsePayablesInput(versionedInvoiceInputSchema, input);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await permit(deps, parsed.data, "payables.manage");
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.cancel({
		...parsed.data,
		effects: deps.effects,
	});
}

export async function getSupplierInvoiceByIdOperation(
	input: unknown,
	deps: InvoiceLifecycleOperationDeps,
): Promise<Result<SupplierInvoice | null>> {
	const parsed = parsePayablesInput(getInvoiceInputSchema, input);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await permit(deps, parsed.data, "payables.read");
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.getById(parsed.data.organizationId, parsed.data.id);
}

export async function listSupplierInvoicesOperation(
	input: unknown,
	deps: InvoiceLifecycleOperationDeps,
): Promise<Result<SupplierInvoice[]>> {
	const parsed = parsePayablesInput(listInvoicesInputSchema, input);
	if (!parsed.ok) {
		return parsed;
	}
	const allowed = await permit(deps, parsed.data, "payables.read");
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.list(parsed.data);
}
