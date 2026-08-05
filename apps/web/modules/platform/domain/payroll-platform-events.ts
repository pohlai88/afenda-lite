// biome-ignore-all lint/performance/noAwaitInLoops: Payment and posting intake runs sequentially with fail-fast semantics.
import { audit } from "@afenda/audit";
import { postFinancialSourceEvent } from "@afenda/accounting";
import {
	errorIngress,
	errorResult,
	errorWire,
	type Result,
} from "@afenda/errors";
import type { DomainEvent, DomainEventHandlerMap } from "@afenda/events";
import {
	PAYROLL_EVENT_IDS,
	PAYROLL_PAYMENT_CORRECTION_REQUESTED_EVENT,
	PAYROLL_PAYMENT_REQUESTED_EVENT,
	PAYROLL_POSTING_CORRECTION_REQUESTED_EVENT,
	PAYROLL_POSTING_REQUESTED_EVENT,
	PAYROLL_RUN_CALCULATED_EVENT,
	PAYROLL_RUN_FINALIZED_EVENT,
	PAYROLL_RUN_REVERSED_EVENT,
	PAYROLL_RUN_STARTED_EVENT,
	type PayrollEventType,
	PayrollEventSchemas,
	type payrollPaymentCorrectionRequestedPayloadSchema,
	type payrollPaymentRequestedPayloadSchema,
	type payrollPostingCorrectionRequestedPayloadSchema,
	type payrollPostingRequestedPayloadSchema,
} from "@afenda/events/schemas";
import {
	createDraftPayment,
	listPaymentAccounts,
	listPaymentMethods,
	listPayments,
	reversePayment,
	type Payment,
} from "@afenda/payments";
import type { z } from "zod";

import { PAYROLL_PLATFORM_EVENT_DISPATCHER_ID } from "@afenda/payroll";

import { createAccountingCommandOptions } from "@/lib/erp/accounting-command-options";
import { createPaymentsCommandOptions } from "@/lib/erp/payments-command-options";

export { PAYROLL_PLATFORM_EVENT_DISPATCHER_ID };

const PAYROLL_POSTING_RULE_FINALIZE = "PAYROLL-RUN-FINALIZE" as const;
const PAYROLL_POSTING_RULE_REVERSE = "PAYROLL-RUN-REVERSE" as const;

const PAYROLL_POSTING_CATEGORY_ROLES = {
	earning: "payroll_wage_expense",
	pre_tax_deduction: "payroll_deduction_liability",
	employee_statutory: "payroll_statutory_liability",
	post_tax_deduction: "payroll_post_tax_deduction_liability",
	employer_contribution: "payroll_employer_contribution_expense",
} as const;

type PayrollPostingCategory = keyof typeof PAYROLL_POSTING_CATEGORY_ROLES;

type PayrollPaymentRequestedPayload = z.infer<
	typeof payrollPaymentRequestedPayloadSchema
>;
type PayrollPaymentCorrectionPayload = z.infer<
	typeof payrollPaymentCorrectionRequestedPayloadSchema
>;
type PayrollPostingRequestedPayload = z.infer<
	typeof payrollPostingRequestedPayloadSchema
>;
type PayrollPostingCorrectionPayload = z.infer<
	typeof payrollPostingCorrectionRequestedPayloadSchema
>;

function parsePayrollEventPayload<T extends PayrollEventType>(
	event: DomainEvent,
	eventType: T,
): z.infer<(typeof PayrollEventSchemas)[T]> {
	const schema = PayrollEventSchemas[eventType];
	const parsed = schema.safeParse(event.payload);
	if (!parsed.success) {
		throw errorIngress.code("VALIDATION_ERROR", {
			operation: `payroll.${eventType}.payload`,
		});
	}
	return parsed.data;
}

function assertPayrollEventEnvelope(
	event: DomainEvent,
	payload: { organizationId: string; correlationId: string },
): void {
	if (
		payload.organizationId !== event.organizationId ||
		payload.correlationId !== event.correlationId
	) {
		throw errorIngress.code("VALIDATION_ERROR", {
			operation: "payroll.event.envelope",
		});
	}
}

function throwResult<T>(result: Result<T>): never {
	throw errorWire.deserialize(errorWire.serialize(result));
}

function payrollPaymentCode(runId: string, sourceId: string): string {
	return `payroll-${runId}-${sourceId}`.slice(0, 64);
}

function parseMoneyAmount(amount: string): bigint {
	const normalized = amount.trim();
	const negative = normalized.startsWith("-");
	const digits = negative ? normalized.slice(1) : normalized;
	if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(digits)) {
		throw errorIngress.code("VALIDATION_ERROR", {
			operation: "payroll.money.parse",
		});
	}
	const [whole, fraction = ""] = digits.split(".");
	const scale = 10n ** BigInt(fraction.length);
	const value = BigInt(whole) * scale + BigInt(fraction.padEnd(0, "0") || "0");
	return negative ? -value : value;
}

function formatMoneyAmount(value: bigint, scale = 2): string {
	const negative = value < 0n;
	const absolute = negative ? -value : value;
	const divisor = 10n ** BigInt(scale);
	const whole = absolute / divisor;
	const fraction = absolute % divisor;
	const fractionText = fraction.toString().padStart(scale, "0");
	return `${negative ? "-" : ""}${whole}.${fractionText}`;
}

function addMoneyAmounts(left: string, right: string): string {
	const leftScale = left.includes(".") ? left.split(".")[1]?.length ?? 0 : 0;
	const rightScale = right.includes(".")
		? right.split(".")[1]?.length ?? 0
		: 0;
	const scale = Math.max(leftScale, rightScale);
	const sum =
		parseMoneyAmount(left) + parseMoneyAmount(right);
	return formatMoneyAmount(sum, scale);
}

async function recordPayrollTelemetryAudit(
	event: DomainEvent,
	eventType:
		| typeof PAYROLL_RUN_STARTED_EVENT
		| typeof PAYROLL_RUN_CALCULATED_EVENT
		| typeof PAYROLL_RUN_FINALIZED_EVENT
		| typeof PAYROLL_RUN_REVERSED_EVENT,
): Promise<void> {
	const parsed = parsePayrollEventPayload(event, eventType);
	assertPayrollEventEnvelope(event, parsed);
	const recorded = await audit.record({
		organizationId: event.organizationId,
		actorUserId: event.actorUserId,
		correlationId: event.correlationId,
		entity: parsed.entityType,
		entityId: parsed.entityId,
		action: "UPDATE",
		changes: [
			{
				field: "payrollDomainEventType",
				before: null,
				after: event.type,
			},
		],
	});
	if (!recorded.ok) {
		throwResult(recorded);
	}
}

async function resolvePayrollDisbursementRouting(input: {
	organizationId: string;
	actorUserId: string;
	currencyCode: string;
}): Promise<{ paymentAccountId: string; paymentMethodId: string }> {
	const options = createPaymentsCommandOptions();
	const [accounts, methods] = await Promise.all([
		listPaymentAccounts(
			{
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
			},
			options,
		),
		listPaymentMethods(
			{
				organizationId: input.organizationId,
				actorUserId: input.actorUserId,
			},
			options,
		),
	]);
	if (!accounts.ok) {
		throwResult(accounts);
	}
	if (!methods.ok) {
		throwResult(methods);
	}

	const activeAccounts = accounts.data.filter((account) => account.active);
	const account =
		activeAccounts.find(
			(entry) => entry.currencyCode === input.currencyCode,
		) ?? activeAccounts[0];
	const activeMethods = methods.data.filter((method) => method.active);
	const method =
		activeMethods.find((entry) => entry.kind === "bank-transfer") ??
		activeMethods[0];

	if (account === undefined || method === undefined) {
		throwResult(
			errorResult.fail("SERVICE_UNAVAILABLE", {
				publicMessage:
					"Payroll disbursement routing is not configured for this organization.",
			}),
		);
	}

	return {
		paymentAccountId: account.id,
		paymentMethodId: method.id,
	};
}

async function findPayrollPaymentByCode(input: {
	organizationId: string;
	actorUserId: string;
	code: string;
}): Promise<Payment | null> {
	const options = createPaymentsCommandOptions();
	const listed = await listPayments(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			direction: "disbursement",
			page: 1,
			pageSize: 100,
		},
		options,
	);
	if (!listed.ok) {
		throwResult(listed);
	}
	return listed.data.find((payment) => payment.code === input.code) ?? null;
}

async function intakePayrollPayment(
	event: DomainEvent,
	payload: PayrollPaymentRequestedPayload,
): Promise<void> {
	assertPayrollEventEnvelope(event, payload);
	const options = createPaymentsCommandOptions();
	for (const payment of payload.payments) {
		if (parseMoneyAmount(payment.amount) <= 0n) {
			continue;
		}
		const routing = await resolvePayrollDisbursementRouting({
			organizationId: event.organizationId,
			actorUserId: event.actorUserId,
			currencyCode: payment.currencyCode,
		});
		const created = await createDraftPayment(
			{
				organizationId: event.organizationId,
				actorUserId: event.actorUserId,
				correlationId: event.correlationId,
				idempotencyKey: `payroll-payment:${event.id}:${payment.sourceId}`,
				code: payrollPaymentCode(payload.entityId, payment.sourceId),
				paymentAccountId: routing.paymentAccountId,
				paymentMethodId: routing.paymentMethodId,
				direction: "disbursement",
				purpose: "manual_disbursement",
				currencyCode: payment.currencyCode,
				amount: payment.amount,
				reference: `payroll-run:${payload.entityId}:employee:${payment.employeeId}`,
			},
			options,
		);
		if (!created.ok) {
			throwResult(created);
		}
	}
}

async function intakePayrollPaymentCorrection(
	event: DomainEvent,
	payload: PayrollPaymentCorrectionPayload,
): Promise<void> {
	assertPayrollEventEnvelope(event, payload);
	const options = createPaymentsCommandOptions();
	for (const payment of payload.payments) {
		const amount = parseMoneyAmount(payment.amount);
		if (amount === 0n) {
			continue;
		}
		if (amount > 0n) {
			throwResult(
				errorResult.fail("VALIDATION_ERROR", {
					publicMessage:
						"Payroll payment correction amounts must be zero or negative.",
				}),
			);
		}
		const existing = await findPayrollPaymentByCode({
			organizationId: event.organizationId,
			actorUserId: event.actorUserId,
			code: payrollPaymentCode(payload.originalRunId, payment.sourceId),
		});
		if (existing === null) {
			throwResult(
				errorResult.fail("NOT_FOUND", {
					publicMessage:
						"Payroll disbursement to reverse was not found for this correction.",
				}),
			);
		}
		if (existing.status === "reversed") {
			continue;
		}
		const reversed = await reversePayment(
			{
				organizationId: event.organizationId,
				actorUserId: event.actorUserId,
				correlationId: event.correlationId,
				idempotencyKey: `payroll-payment-reverse:${event.id}:${payment.sourceId}`,
				paymentId: existing.id,
				expectedVersion: existing.version,
				reason: `Payroll run reversed (${payload.reasonCode})`,
			},
			options,
		);
		if (!reversed.ok) {
			throwResult(reversed);
		}
	}
}

function aggregatePostingAmountsByCurrency(
	lines: ReadonlyArray<{
		amount: string;
		category: PayrollPostingCategory;
		currencyCode: string;
	}>,
): Map<string, Record<string, string>> {
	const grouped = new Map<string, Record<string, string>>();
	for (const line of lines) {
		const role = PAYROLL_POSTING_CATEGORY_ROLES[line.category];
		const rolesForCurrency = grouped.get(line.currencyCode) ?? {};
		rolesForCurrency[role] = addMoneyAmounts(
			rolesForCurrency[role] ?? "0",
			line.amount,
		);
		grouped.set(line.currencyCode, rolesForCurrency);
	}
	return grouped;
}

async function intakePayrollPosting(
	event: DomainEvent,
	payload: PayrollPostingRequestedPayload | PayrollPostingCorrectionPayload,
	postingRuleCode: typeof PAYROLL_POSTING_RULE_FINALIZE | typeof PAYROLL_POSTING_RULE_REVERSE,
): Promise<void> {
	assertPayrollEventEnvelope(event, payload);
	const grouped = aggregatePostingAmountsByCurrency(payload.lines);
	const options = createAccountingCommandOptions();
	for (const [currencyCode, amountByRole] of grouped) {
		const posted = await postFinancialSourceEvent(
			{
				organizationId: event.organizationId,
				actorUserId: event.actorUserId,
				correlationId: event.correlationId,
				sourceModule: "payroll",
				sourceAggregateId: payload.entityId,
				sourceEventId: event.id,
				sourceEventVersion: 1,
				postingRuleCode,
				periodId: payload.periodId,
				currencyCode,
				description: `Payroll posting for run ${payload.entityId}`,
				amountByRole,
			},
			options,
		);
		if (!posted.ok) {
			throwResult(posted);
		}
	}
}

async function handlePayrollPlatformEvent(event: DomainEvent): Promise<void> {
	switch (event.type) {
		case PAYROLL_RUN_STARTED_EVENT:
			await recordPayrollTelemetryAudit(event, PAYROLL_RUN_STARTED_EVENT);
			return;
		case PAYROLL_RUN_CALCULATED_EVENT:
			await recordPayrollTelemetryAudit(event, PAYROLL_RUN_CALCULATED_EVENT);
			return;
		case PAYROLL_RUN_FINALIZED_EVENT:
			await recordPayrollTelemetryAudit(event, PAYROLL_RUN_FINALIZED_EVENT);
			return;
		case PAYROLL_RUN_REVERSED_EVENT:
			await recordPayrollTelemetryAudit(event, PAYROLL_RUN_REVERSED_EVENT);
			return;
		case PAYROLL_PAYMENT_REQUESTED_EVENT:
			await intakePayrollPayment(
				event,
				parsePayrollEventPayload(event, PAYROLL_PAYMENT_REQUESTED_EVENT),
			);
			return;
		case PAYROLL_PAYMENT_CORRECTION_REQUESTED_EVENT:
			await intakePayrollPaymentCorrection(
				event,
				parsePayrollEventPayload(
					event,
					PAYROLL_PAYMENT_CORRECTION_REQUESTED_EVENT,
				),
			);
			return;
		case PAYROLL_POSTING_REQUESTED_EVENT:
			await intakePayrollPosting(
				event,
				parsePayrollEventPayload(event, PAYROLL_POSTING_REQUESTED_EVENT),
				PAYROLL_POSTING_RULE_FINALIZE,
			);
			return;
		case PAYROLL_POSTING_CORRECTION_REQUESTED_EVENT:
			await intakePayrollPosting(
				event,
				parsePayrollEventPayload(
					event,
					PAYROLL_POSTING_CORRECTION_REQUESTED_EVENT,
				),
				PAYROLL_POSTING_RULE_REVERSE,
			);
			return;
		default:
			throw errorIngress.code("INTERNAL_ERROR", {
				operation: "payroll.platform-event.handler",
			});
	}
}

export function createPayrollPlatformEventHandlers(): DomainEventHandlerMap {
	const handlers: DomainEventHandlerMap = {};
	for (const eventType of PAYROLL_EVENT_IDS) {
		if (eventType === "payroll.payslip.published.v1") {
			continue;
		}
		handlers[eventType] = async (event) => {
			await handlePayrollPlatformEvent(event);
		};
	}
	return handlers;
}
