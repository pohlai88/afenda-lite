import { fail, ok, type Result } from "@afenda/errors/result";
import {
	applySupplierPayment,
	reverseSupplierPaymentApplication,
} from "@afenda/payables";
import {
	getPaymentById,
	markApplicationInstructionApplied,
	markApplicationInstructionRejected,
	type Payment,
} from "@afenda/payments";
import {
	applyCustomerReceipt,
	getSalesInvoiceById,
	reverseCustomerAllocationsByPayment,
} from "@afenda/receivables";

import { createPayablesCommandOptions } from "@/lib/erp/payables-command-options";
import { createPaymentsCommandOptions } from "@/lib/erp/payments-command-options";
import { createReceivablesCommandOptions } from "@/lib/erp/receivables-command-options";

type ApplicationContext = {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
};

export async function applyPaymentInstructionsAfterPost(
	input: ApplicationContext & { payment: Payment },
): Promise<Result<void>> {
	for (const instruction of input.payment.applicationInstructions) {
		if (instruction.status !== "pending") continue;

		const application =
			instruction.targetModule === "receivables" &&
			instruction.targetDocumentType === "customer_invoice"
				? await applyCustomerReceiptForInstruction(input, instruction)
				: instruction.targetModule === "payables" &&
						instruction.targetDocumentType === "supplier_invoice"
					? await applySupplierPayment(
							{
								...input,
								invoiceId: instruction.targetDocumentId,
								amount: instruction.intendedAmount,
								paymentId: input.payment.id,
								paymentApplicationInstructionId: instruction.id,
								idempotencyKey: `${input.payment.id}:${instruction.id}:apply`,
							},
							createPayablesCommandOptions(input.actorUserId),
						)
					: fail(
							"BAD_REQUEST",
							"Unsupported payment application target (v1 invoice-only)",
						);

		const instructionResult = application.ok
			? await markApplicationInstructionApplied(
					{
						...input,
						instructionId: instruction.id,
						appliedAmount: application.data.amount,
						idempotencyKey: `${input.payment.id}:${instruction.id}:applied`,
					},
					createPaymentsCommandOptions(),
				)
			: await markApplicationInstructionRejected(
					{
						...input,
						instructionId: instruction.id,
						rejectionCode: application.code,
						idempotencyKey: `${input.payment.id}:${instruction.id}:rejected`,
					},
					createPaymentsCommandOptions(),
				);
		if (!instructionResult.ok) return instructionResult;
	}
	return ok(undefined);
}

async function applyCustomerReceiptForInstruction(
	input: ApplicationContext & { payment: Payment },
	instruction: Payment["applicationInstructions"][number],
) {
	const options = createReceivablesCommandOptions();
	const invoice = await getSalesInvoiceById(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			id: instruction.targetDocumentId,
		},
		options,
	);
	if (!invoice.ok) return invoice;
	if (invoice.data === null)
		return fail("NOT_FOUND", "Sales invoice not found");

	return applyCustomerReceipt(
		{
			...input,
			paymentId: input.payment.id,
			paymentApplicationInstructionId: instruction.id,
			salesInvoiceId: instruction.targetDocumentId,
			amount: instruction.intendedAmount,
			expectedInvoiceVersion: invoice.data.version,
			idempotencyKey: `${input.payment.id}:${instruction.id}:apply`,
		},
		options,
	);
}

export async function reversePaymentApplications(
	input: ApplicationContext & { paymentId: string },
): Promise<Result<void>> {
	const [customerReversal, supplierReversal] = await Promise.all([
		reverseCustomerAllocationsByPayment(
			{
				...input,
				paymentId: input.paymentId,
				idempotencyKey: `${input.paymentId}:customer-reverse`,
			},
			createReceivablesCommandOptions(),
		),
		reverseSupplierPaymentApplication(
			{
				...input,
				paymentId: input.paymentId,
				idempotencyKey: `${input.paymentId}:supplier-reverse`,
			},
			createPayablesCommandOptions(input.actorUserId),
		),
	]);
	if (!customerReversal.ok) return customerReversal;
	if (!supplierReversal.ok) return supplierReversal;
	const payment = await getPaymentById(
		{ ...input, id: input.paymentId },
		createPaymentsCommandOptions(),
	);
	if (!payment.ok) return payment;
	if (payment.data === null) return fail("NOT_FOUND", "Payment not found");
	for (const instruction of payment.data.applicationInstructions) {
		if (instruction.status !== "pending" && instruction.status !== "applied") {
			continue;
		}
		const marked = await markApplicationInstructionRejected(
			{
				...input,
				instructionId: instruction.id,
				rejectionCode: "PAYMENT_REVERSED",
				idempotencyKey: `${input.paymentId}:${instruction.id}:reversed`,
			},
			createPaymentsCommandOptions(),
		);
		if (!marked.ok) return marked;
	}
	return ok(undefined);
}
