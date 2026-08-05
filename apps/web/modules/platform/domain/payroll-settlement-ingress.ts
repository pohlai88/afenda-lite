import {
	errorIngress,
	errorResult,
	errorWire,
	type Result,
} from "@afenda/errors";
import { getSourcePostingTrace } from "@afenda/accounting";
import type { DomainEvent, DomainEventHandlerMap } from "@afenda/events";
import {
	ACCOUNTING_JOURNAL_POSTED_EVENT,
	PAYMENTS_PAYMENT_POSTED_EVENT,
	PAYMENTS_PAYMENT_REVERSED_EVENT,
	PaymentsEventSchemas,
	AccountingEventSchemas,
} from "@afenda/events/schemas";
import { getPaymentById } from "@afenda/payments";
import {
	parsePayrollDisbursementReference,
	recordPaymentSettlement,
	recordPostingConfirmation,
} from "@afenda/payroll";
import type { z } from "zod";

import { createAccountingCommandOptions } from "@/lib/erp/accounting-command-options";
import { createPaymentsCommandOptions } from "@/lib/erp/payments-command-options";
import { createPayrollCommandOptions } from "@/lib/erp/payroll-command-options";

type PaymentPostedPayload = z.infer<
	(typeof PaymentsEventSchemas)[typeof PAYMENTS_PAYMENT_POSTED_EVENT]
>;
type PaymentReversedPayload = z.infer<
	(typeof PaymentsEventSchemas)[typeof PAYMENTS_PAYMENT_REVERSED_EVENT]
>;
type JournalPostedPayload = z.infer<
	(typeof AccountingEventSchemas)[typeof ACCOUNTING_JOURNAL_POSTED_EVENT]
>;

function throwFailure<T>(
	result: Extract<Result<T>, { ok: false }>,
): never {
	throw errorWire.deserialize(errorWire.serialize(result));
}

function settlementAmountForPaymentStatus(input: {
	status: PaymentPostedPayload["status"] | "reversed";
	amount: string;
}): string {
	if (input.status === "posted") {
		return input.amount;
	}
	return "0";
}

async function intakePayrollPaymentSettlement(
	event: DomainEvent,
	payload: PaymentPostedPayload | PaymentReversedPayload,
): Promise<void> {
	const options = createPaymentsCommandOptions();
	const loaded = await getPaymentById(
		{
			organizationId: event.organizationId,
			actorUserId: event.actorUserId,
			id: payload.paymentId,
		},
		options,
	);
	if (!loaded.ok) {
		throwFailure(loaded);
	}
	if (loaded.data === null) {
		throwFailure(
			errorResult.fail("NOT_FOUND", {
				publicMessage: "Payroll settlement intake could not load the payment.",
			}),
		);
	}
	const payment = loaded.data;
	const parsedReference = parsePayrollDisbursementReference(payment.reference);
	if (!parsedReference.ok) {
		throwFailure(parsedReference);
	}
	if (parsedReference.data === null) {
		return;
	}
	const settlementStatus =
		payload.status === "reversed"
			? ("returned" as const)
			: payload.status === "posted"
				? ("settled" as const)
				: ("failed" as const);
	const recorded = await recordPaymentSettlement(
		{
			organizationId: event.organizationId,
			runId: parsedReference.data.runId,
			paymentId: payload.paymentId,
			settlementStatus,
			actualAmount: settlementAmountForPaymentStatus({
				status: payload.status,
				amount: payment.amount,
			}),
			currencyCode: payment.currencyCode,
			idempotencyKey: `payroll-settlement:payment:${event.id}`,
			actorUserId: event.actorUserId,
			correlationId: event.correlationId,
		},
		createPayrollCommandOptions(),
	);
	if (!recorded.ok) {
		throwFailure(recorded);
	}
}

async function intakePayrollPostingConfirmation(
	event: DomainEvent,
	payload: JournalPostedPayload,
): Promise<void> {
	const accountingOptions = createAccountingCommandOptions();
	const traces = await getSourcePostingTrace(
		{
			organizationId: event.organizationId,
			actorUserId: event.actorUserId,
			journalId: payload.entityId,
		},
		accountingOptions,
	);
	if (!traces.ok) {
		throwFailure(traces);
	}
	const payrollTrace = traces.data.find(
		(trace) => trace.link.sourceModule === "payroll",
	);
	if (payrollTrace === undefined) {
		return;
	}
	const debitTotal = (payload.lines ?? []).reduce((total, line) => {
		const debit = Number.parseFloat(line.debit);
		return Number.isFinite(debit) ? total + debit : total;
	}, 0);
	const recorded = await recordPostingConfirmation(
		{
			organizationId: event.organizationId,
			runId: payrollTrace.link.sourceAggregateId,
			journalId: payload.entityId,
			actualAmount: debitTotal.toFixed(2),
			currencyCode: payrollTrace.journal.currencyCode,
			idempotencyKey: `payroll-settlement:posting:${event.id}`,
			actorUserId: event.actorUserId,
			correlationId: event.correlationId,
		},
		createPayrollCommandOptions(),
	);
	if (!recorded.ok) {
		throwFailure(recorded);
	}
}

async function handlePayrollSettlementIngressEvent(
	event: DomainEvent,
): Promise<void> {
	switch (event.type) {
		case PAYMENTS_PAYMENT_POSTED_EVENT:
			await intakePayrollPaymentSettlement(
				event,
				PaymentsEventSchemas[PAYMENTS_PAYMENT_POSTED_EVENT].parse(
					event.payload,
				),
			);
			return;
		case PAYMENTS_PAYMENT_REVERSED_EVENT:
			await intakePayrollPaymentSettlement(
				event,
				PaymentsEventSchemas[PAYMENTS_PAYMENT_REVERSED_EVENT].parse(
					event.payload,
				),
			);
			return;
		case ACCOUNTING_JOURNAL_POSTED_EVENT:
			await intakePayrollPostingConfirmation(
				event,
				AccountingEventSchemas[ACCOUNTING_JOURNAL_POSTED_EVENT].parse(
					event.payload,
				),
			);
			return;
		default:
			throw errorIngress.code("INTERNAL_ERROR", {
				operation: "payroll.settlement-ingress.handler",
			});
	}
}

export function createPayrollSettlementIngressHandlers(): DomainEventHandlerMap {
	return {
		[PAYMENTS_PAYMENT_POSTED_EVENT]: handlePayrollSettlementIngressEvent,
		[PAYMENTS_PAYMENT_REVERSED_EVENT]: handlePayrollSettlementIngressEvent,
		[ACCOUNTING_JOURNAL_POSTED_EVENT]: handlePayrollSettlementIngressEvent,
	};
}
