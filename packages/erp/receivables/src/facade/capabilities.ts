import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";
import {
	addSalesInvoiceLineInputSchema,
	applyCustomerReceiptInputSchema,
	cancelDraftSalesInvoiceInputSchema,
	closeSalesInvoiceInputSchema,
	createDraftSalesInvoiceInputSchema,
	getCustomerAgingInputSchema,
	getCustomerBalanceInputSchema,
	getSalesInvoiceByIdInputSchema,
	issueCreditNoteInputSchema,
	listSalesInvoicesInputSchema,
	postSalesInvoiceInputSchema,
	reverseCustomerAllocationsByPaymentInputSchema,
	reverseCustomerReceiptApplicationInputSchema,
} from "../features/invoices/invoices.schema";
import type { ReceivablesStore } from "../features/invoices/invoices.store";
import type {
	CustomerAging,
	CustomerAllocation,
	CustomerBalance,
	SalesCreditNote,
	SalesInvoice,
	SalesInvoiceLine,
} from "../kernel/contracts/domain";
import type {
	InvoiceableDelivery,
	InvoiceableSalesOrder,
} from "../kernel/contracts/ports";
import { collectSequentially } from "../kernel/execution/async";
import {
	requireReceivablesCommandPermission,
	requireReceivablesQueryPermission,
} from "../kernel/execution/authorization";
import { decimal, format, subtract } from "../kernel/money";
import {
	RECEIVABLES_COMMAND_CREDIT_NOTE_ISSUE,
	RECEIVABLES_COMMAND_INVOICE_CANCEL,
	RECEIVABLES_COMMAND_INVOICE_CLOSE,
	RECEIVABLES_COMMAND_INVOICE_CREATE,
	RECEIVABLES_COMMAND_INVOICE_LINE_ADD,
	RECEIVABLES_COMMAND_INVOICE_POST,
	RECEIVABLES_COMMAND_RECEIPT_APPLICATION_REVERSE,
	RECEIVABLES_COMMAND_RECEIPT_APPLY,
	RECEIVABLES_QUERY_AGING_GET,
	RECEIVABLES_QUERY_BALANCE_GET,
	RECEIVABLES_QUERY_INVOICE_GET,
	RECEIVABLES_QUERY_INVOICE_LIST,
} from "../kernel/operations/module-ids";
import { normalizeReceivablesCode } from "../kernel/validation/code";
import { parseReceivablesInput } from "../kernel/validation/parse-input";
import {
	type ReceivablesCommandOptions,
	resolveCommandDeps,
} from "./contracts";

type CommandDeps = ReturnType<typeof resolveCommandDeps>;
type CreateDraftInput = z.infer<typeof createDraftSalesInvoiceInputSchema>;
type PostInvoiceInput = z.infer<typeof postSalesInvoiceInputSchema>;
type SourceLineCheck = NonNullable<
	Parameters<ReceivablesStore["postInvoice"]>[0]["sourceLineChecks"]
>[number];

async function validateDraftInvoiceSource(
	input: CreateDraftInput,
	deps: CommandDeps,
): Promise<Result<void>> {
	if (input.invoiceSource === "sales_order") {
		if (deps.salesSource === undefined || input.salesOrderId === undefined) {
			return errorResult.fail("BAD_REQUEST", {
				publicMessage: "Sales invoice source port is required",
			});
		}
		const source = await deps.salesSource.getInvoiceableSalesOrder({
			organizationId: input.organizationId,
			salesOrderId: input.salesOrderId,
			actorUserId: input.actorUserId,
		});
		if (!source.ok) {
			return source;
		}
		return source.data === null
			? errorResult.fail("NOT_FOUND", {
					publicMessage: "Invoiceable sales order not found",
				})
			: errorResult.ok(undefined);
	}
	if (input.invoiceSource === "delivery") {
		if (deps.deliverySource === undefined || input.deliveryId === undefined) {
			return errorResult.fail("BAD_REQUEST", {
				publicMessage: "Delivery invoice source port is required",
			});
		}
		const source = await deps.deliverySource.getInvoiceableDelivery({
			organizationId: input.organizationId,
			deliveryId: input.deliveryId,
			actorUserId: input.actorUserId,
		});
		if (!source.ok) {
			return source;
		}
		return source.data === null
			? errorResult.fail("NOT_FOUND", {
					publicMessage: "Invoiceable delivery not found",
				})
			: errorResult.ok(undefined);
	}
	return errorResult.ok(undefined);
}

function collectSalesOrderLineChecks(
	invoice: SalesInvoice,
	input: PostInvoiceInput,
	deps: CommandDeps,
	source: InvoiceableSalesOrder,
): Promise<Result<SourceLineCheck[]>> {
	return collectSequentially(invoice.lines, async (line) => {
		if (line.salesOrderLineId === null) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Sales-order invoice lines require salesOrderLineId",
			});
		}
		const sourceLine = source.lines.find(
			(row) => row.salesOrderLineId === line.salesOrderLineId,
		);
		if (sourceLine === undefined) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Invoice line source is not invoiceable",
			});
		}
		const posted = await deps.store.sumPostedQuantityForSourceLine({
			organizationId: input.organizationId,
			salesOrderLineId: line.salesOrderLineId,
			excludeInvoiceId: invoice.id,
		});
		if (!posted.ok) {
			return posted;
		}
		return errorResult.ok({
			salesOrderLineId: line.salesOrderLineId,
			deliveryLineId: null,
			quantity: line.quantity,
			remainingInvoiceableQuantity: format(
				decimal(sourceLine.authorizedQuantity) - decimal(posted.data),
			),
		});
	});
}

function collectDeliveryLineChecks(
	invoice: SalesInvoice,
	input: PostInvoiceInput,
	deps: CommandDeps,
	source: InvoiceableDelivery,
): Promise<Result<SourceLineCheck[]>> {
	return collectSequentially(invoice.lines, async (line) => {
		if (line.deliveryLineId === null) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Delivery invoice lines require deliveryLineId",
			});
		}
		const sourceLine = source.lines.find(
			(row) => row.deliveryLineId === line.deliveryLineId,
		);
		if (sourceLine === undefined) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Invoice line source is not invoiceable",
			});
		}
		const posted = await deps.store.sumPostedQuantityForSourceLine({
			organizationId: input.organizationId,
			deliveryLineId: line.deliveryLineId,
			excludeInvoiceId: invoice.id,
		});
		if (!posted.ok) {
			return posted;
		}
		return errorResult.ok({
			salesOrderLineId: null,
			deliveryLineId: line.deliveryLineId,
			quantity: line.quantity,
			remainingInvoiceableQuantity: format(
				decimal(sourceLine.authorizedQuantity) - decimal(posted.data),
			),
		});
	});
}

async function buildSourceLineChecks(
	invoice: SalesInvoice,
	input: PostInvoiceInput,
	deps: CommandDeps,
): Promise<Result<SourceLineCheck[]>> {
	if (invoice.invoiceSource === "sales_order") {
		if (deps.salesSource === undefined || invoice.salesOrderId === null) {
			return errorResult.fail("BAD_REQUEST", {
				publicMessage: "Sales invoice source port is required at post",
			});
		}
		const source = await deps.salesSource.getInvoiceableSalesOrder({
			organizationId: input.organizationId,
			salesOrderId: invoice.salesOrderId,
			actorUserId: input.actorUserId,
		});
		if (!source.ok) {
			return source;
		}
		if (source.data === null) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "Invoiceable sales order not found",
			});
		}
		return collectSalesOrderLineChecks(invoice, input, deps, source.data);
	}
	if (invoice.invoiceSource === "delivery") {
		if (deps.deliverySource === undefined || invoice.deliveryId === null) {
			return errorResult.fail("BAD_REQUEST", {
				publicMessage: "Delivery invoice source port is required at post",
			});
		}
		const source = await deps.deliverySource.getInvoiceableDelivery({
			organizationId: input.organizationId,
			deliveryId: invoice.deliveryId,
			actorUserId: input.actorUserId,
		});
		if (!source.ok) {
			return source;
		}
		if (source.data === null) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "Invoiceable delivery not found",
			});
		}
		return collectDeliveryLineChecks(invoice, input, deps, source.data);
	}
	return errorResult.ok([]);
}

export async function createDraftSalesInvoice(
	input: unknown,
	options: ReceivablesCommandOptions = {},
): Promise<Result<SalesInvoice>> {
	const parsed = parseReceivablesInput(
		createDraftSalesInvoiceInputSchema,
		input,
		"Invalid sales invoice create input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const deps = resolveCommandDeps(options);
	const allowed = await requireReceivablesCommandPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: RECEIVABLES_COMMAND_INVOICE_CREATE,
		},
	);
	if (!allowed.ok) {
		return allowed;
	}

	const sourceValidation = await validateDraftInvoiceSource(parsed.data, deps);
	if (!sourceValidation.ok) {
		return sourceValidation;
	}

	const created = await deps.store.createInvoice({
		organizationId: parsed.data.organizationId,
		code: parsed.data.code,
		normalizedCode: normalizeReceivablesCode(parsed.data.code),
		invoiceSource: parsed.data.invoiceSource,
		customerId: parsed.data.customerId,
		customerCode: parsed.data.customerCode,
		customerName: parsed.data.customerName,
		currencyCode: parsed.data.currencyCode,
		salesOrderId: parsed.data.salesOrderId ?? null,
		deliveryId: parsed.data.deliveryId ?? null,
		invoiceDate: parsed.data.invoiceDate ?? null,
		accountingDate: parsed.data.accountingDate ?? null,
		dueDate: parsed.data.dueDate ?? null,
		paymentTermCode: parsed.data.paymentTermCode ?? null,
		paymentTermDescription: parsed.data.paymentTermDescription ?? null,
		manualReason: parsed.data.manualReason ?? null,
		idempotencyKey: parsed.data.idempotencyKey,
		actorUserId: parsed.data.actorUserId,
	});
	if (!created.ok) {
		return created;
	}
	const emitted = await deps.effects.emit({
		type: "receivables.invoice.created.v1",
		organizationId: created.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
		payload: {
			organizationId: created.data.organizationId,
			entityId: created.data.id,
			customerId: created.data.customerId,
			amount: created.data.totalAmount,
			currencyCode: created.data.currencyCode,
			actorId: parsed.data.actorUserId,
			correlationId: parsed.data.correlationId,
		},
	});
	if (!emitted.ok) {
		return emitted;
	}
	return created;
}

export async function addSalesInvoiceLine(
	input: unknown,
	options: ReceivablesCommandOptions = {},
): Promise<Result<SalesInvoiceLine>> {
	const parsed = parseReceivablesInput(
		addSalesInvoiceLineInputSchema,
		input,
		"Invalid sales invoice line input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const deps = resolveCommandDeps(options);
	const allowed = await requireReceivablesCommandPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: RECEIVABLES_COMMAND_INVOICE_LINE_ADD,
		},
	);
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.addLine({
		organizationId: parsed.data.organizationId,
		invoiceId: parsed.data.invoiceId,
		itemId: parsed.data.itemId,
		itemCode: parsed.data.itemCode,
		itemName: parsed.data.itemName,
		description: parsed.data.description,
		quantity: parsed.data.quantity,
		unitPrice: parsed.data.unitPrice,
		salesOrderLineId: parsed.data.salesOrderLineId ?? null,
		deliveryLineId: parsed.data.deliveryLineId ?? null,
		idempotencyKey: parsed.data.idempotencyKey,
		actorUserId: parsed.data.actorUserId,
	});
}

export async function postSalesInvoice(
	input: unknown,
	options: ReceivablesCommandOptions = {},
): Promise<Result<SalesInvoice>> {
	const parsed = parseReceivablesInput(
		postSalesInvoiceInputSchema,
		input,
		"Invalid sales invoice post input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const deps = resolveCommandDeps(options);
	const allowed = await requireReceivablesCommandPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: RECEIVABLES_COMMAND_INVOICE_POST,
		},
	);
	if (!allowed.ok) {
		return allowed;
	}

	const invoice = await deps.store.getById(
		parsed.data.organizationId,
		parsed.data.invoiceId,
	);
	if (!invoice.ok) {
		return invoice;
	}
	if (invoice.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Sales invoice not found",
		});
	}

	const sourceLineChecks = await buildSourceLineChecks(
		invoice.data,
		parsed.data,
		deps,
	);
	if (!sourceLineChecks.ok) {
		return sourceLineChecks;
	}

	return deps.store.postInvoice({
		organizationId: parsed.data.organizationId,
		invoiceId: parsed.data.invoiceId,
		expectedVersion: parsed.data.expectedVersion,
		idempotencyKey: parsed.data.idempotencyKey,
		actorUserId: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
		effects: deps.effects,
		sourceLineChecks: sourceLineChecks.data,
	});
}

export async function issueCreditNote(
	input: unknown,
	options: ReceivablesCommandOptions = {},
): Promise<Result<SalesCreditNote>> {
	const parsed = parseReceivablesInput(
		issueCreditNoteInputSchema,
		input,
		"Invalid credit note input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const deps = resolveCommandDeps(options);
	const allowed = await requireReceivablesCommandPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: RECEIVABLES_COMMAND_CREDIT_NOTE_ISSUE,
		},
	);
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.issueCredit({
		organizationId: parsed.data.organizationId,
		code: parsed.data.code,
		normalizedCode: normalizeReceivablesCode(parsed.data.code),
		salesInvoiceId: parsed.data.salesInvoiceId,
		customerId: parsed.data.customerId,
		customerCode: parsed.data.customerCode,
		customerName: parsed.data.customerName,
		currencyCode: parsed.data.currencyCode,
		amount: parsed.data.amount,
		idempotencyKey: parsed.data.idempotencyKey,
		actorUserId: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
		effects: deps.effects,
	});
}

export async function applyCustomerReceipt(
	input: unknown,
	options: ReceivablesCommandOptions = {},
): Promise<Result<CustomerAllocation>> {
	const parsed = parseReceivablesInput(
		applyCustomerReceiptInputSchema,
		input,
		"Invalid customer receipt application input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const deps = resolveCommandDeps(options);
	const allowed = await requireReceivablesCommandPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: RECEIVABLES_COMMAND_RECEIPT_APPLY,
		},
	);
	if (!allowed.ok) {
		return allowed;
	}

	if (deps.paymentApplication !== undefined) {
		const availability =
			await deps.paymentApplication.getInstructionAvailability({
				organizationId: parsed.data.organizationId,
				paymentId: parsed.data.paymentId,
				paymentApplicationInstructionId:
					parsed.data.paymentApplicationInstructionId,
				actorUserId: parsed.data.actorUserId,
			});
		if (!availability.ok) {
			return availability;
		}
		if (availability.data === null) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "Payment application instruction not found",
			});
		}
		if (availability.data.paymentStatus !== "posted") {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Payment must be posted before application",
			});
		}
		if (availability.data.targetDocumentId !== parsed.data.salesInvoiceId) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Instruction target does not match invoice",
			});
		}
		if (
			decimal(parsed.data.amount) > decimal(availability.data.availableAmount)
		) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "Application exceeds available payment value",
			});
		}
	}

	return deps.store.applyReceipt({
		organizationId: parsed.data.organizationId,
		invoiceId: parsed.data.salesInvoiceId,
		amount: parsed.data.amount,
		paymentId: parsed.data.paymentId,
		paymentApplicationInstructionId:
			parsed.data.paymentApplicationInstructionId,
		expectedInvoiceVersion: parsed.data.expectedInvoiceVersion,
		idempotencyKey: parsed.data.idempotencyKey,
		actorUserId: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
		effects: deps.effects,
	});
}

export async function reverseCustomerReceiptApplication(
	input: unknown,
	options: ReceivablesCommandOptions = {},
): Promise<Result<CustomerAllocation>> {
	const parsed = parseReceivablesInput(
		reverseCustomerReceiptApplicationInputSchema,
		input,
		"Invalid customer receipt application reverse input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const deps = resolveCommandDeps(options);
	const allowed = await requireReceivablesCommandPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: RECEIVABLES_COMMAND_RECEIPT_APPLICATION_REVERSE,
		},
	);
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.reverseReceiptApplication({
		organizationId: parsed.data.organizationId,
		allocationId: parsed.data.allocationId,
		idempotencyKey: parsed.data.idempotencyKey,
		actorUserId: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
		effects: deps.effects,
	});
}

export async function reverseCustomerAllocationsByPayment(
	input: unknown,
	options: ReceivablesCommandOptions = {},
): Promise<Result<CustomerAllocation[]>> {
	const parsed = parseReceivablesInput(
		reverseCustomerAllocationsByPaymentInputSchema,
		input,
		"Invalid customer allocation reversal input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const deps = resolveCommandDeps(options);
	const allowed = await requireReceivablesCommandPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: RECEIVABLES_COMMAND_RECEIPT_APPLICATION_REVERSE,
		},
	);
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.reverseAllocationsByPayment({
		organizationId: parsed.data.organizationId,
		paymentId: parsed.data.paymentId,
		idempotencyKey: parsed.data.idempotencyKey,
		actorUserId: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
		effects: deps.effects,
	});
}

export async function cancelDraftSalesInvoice(
	input: unknown,
	options: ReceivablesCommandOptions = {},
): Promise<Result<SalesInvoice>> {
	const parsed = parseReceivablesInput(
		cancelDraftSalesInvoiceInputSchema,
		input,
		"Invalid sales invoice cancel input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const deps = resolveCommandDeps(options);
	const allowed = await requireReceivablesCommandPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: RECEIVABLES_COMMAND_INVOICE_CANCEL,
		},
	);
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.cancelDraft({
		organizationId: parsed.data.organizationId,
		invoiceId: parsed.data.invoiceId,
		expectedVersion: parsed.data.expectedVersion,
		idempotencyKey: parsed.data.idempotencyKey,
		actorUserId: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
		effects: deps.effects,
	});
}

export async function closeSalesInvoice(
	input: unknown,
	options: ReceivablesCommandOptions = {},
): Promise<Result<SalesInvoice>> {
	const parsed = parseReceivablesInput(
		closeSalesInvoiceInputSchema,
		input,
		"Invalid sales invoice close input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const deps = resolveCommandDeps(options);
	const allowed = await requireReceivablesCommandPermission(
		deps.authorization,
		{
			organizationId: parsed.data.organizationId,
			actorUserId: parsed.data.actorUserId,
			command: RECEIVABLES_COMMAND_INVOICE_CLOSE,
		},
	);
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.closeInvoice({
		organizationId: parsed.data.organizationId,
		invoiceId: parsed.data.invoiceId,
		expectedVersion: parsed.data.expectedVersion,
		idempotencyKey: parsed.data.idempotencyKey,
		actorUserId: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
		effects: deps.effects,
	});
}

export async function getSalesInvoiceById(
	input: unknown,
	options: ReceivablesCommandOptions = {},
): Promise<Result<SalesInvoice | null>> {
	const parsed = parseReceivablesInput(
		getSalesInvoiceByIdInputSchema,
		input,
		"Invalid sales invoice get input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const deps = resolveCommandDeps(options);
	const allowed = await requireReceivablesQueryPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: RECEIVABLES_QUERY_INVOICE_GET,
	});
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.getById(parsed.data.organizationId, parsed.data.id);
}

export async function listSalesInvoices(
	input: unknown,
	options: ReceivablesCommandOptions = {},
): Promise<Result<SalesInvoice[]>> {
	const parsed = parseReceivablesInput(
		listSalesInvoicesInputSchema,
		input,
		"Invalid sales invoice list input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const deps = resolveCommandDeps(options);
	const allowed = await requireReceivablesQueryPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: RECEIVABLES_QUERY_INVOICE_LIST,
	});
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.list(parsed.data);
}

export async function getCustomerBalance(
	input: unknown,
	options: ReceivablesCommandOptions = {},
): Promise<Result<CustomerBalance[]>> {
	const parsed = parseReceivablesInput(
		getCustomerBalanceInputSchema,
		input,
		"Invalid customer balance input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const deps = resolveCommandDeps(options);
	const allowed = await requireReceivablesQueryPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: RECEIVABLES_QUERY_BALANCE_GET,
	});
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.getBalance(
		parsed.data.organizationId,
		parsed.data.customerId,
		parsed.data.currencyCode,
	);
}

export async function getCustomerAging(
	input: unknown,
	options: ReceivablesCommandOptions = {},
): Promise<Result<CustomerAging>> {
	const parsed = parseReceivablesInput(
		getCustomerAgingInputSchema,
		input,
		"Invalid customer aging input",
	);
	if (!parsed.ok) {
		return parsed;
	}
	const deps = resolveCommandDeps(options);
	const allowed = await requireReceivablesQueryPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		query: RECEIVABLES_QUERY_AGING_GET,
	});
	if (!allowed.ok) {
		return allowed;
	}
	return deps.store.getAging(parsed.data);
}

/** Projection rebuild check helper used by reconcile. */
export function expectedOpenBalance(input: {
	postedInvoiceTotal: string;
	postedCreditTotal: string;
	activeAllocationTotal: string;
}): string {
	return subtract(
		subtract(input.postedInvoiceTotal, input.postedCreditTotal),
		input.activeAllocationTotal,
	);
}
