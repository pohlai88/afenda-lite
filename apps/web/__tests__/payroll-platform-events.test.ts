import { errorResult } from "@afenda/errors";
import type { DomainEvent } from "@afenda/events";
import {
	PAYROLL_FINAL_SETTLEMENT_FINALIZED_EVENT,
	PAYROLL_PAYMENT_REQUESTED_EVENT,
	PAYROLL_RUN_STARTED_EVENT,
} from "@afenda/events/schemas";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auditMocks = vi.hoisted(() => ({
	record: vi.fn(),
}));
const paymentsMocks = vi.hoisted(() => ({
	createDraftPayment: vi.fn(),
	listPaymentAccounts: vi.fn(),
	listPaymentMethods: vi.fn(),
	listPayments: vi.fn(),
	reversePayment: vi.fn(),
}));
const accountingMocks = vi.hoisted(() => ({
	postFinancialSourceEvent: vi.fn(),
}));

vi.mock("@afenda/audit", () => ({
	audit: {
		recorder: () => ({
			record: auditMocks.record,
		}),
	},
}));

vi.mock("@afenda/payments", () => ({
	createDraftPayment: paymentsMocks.createDraftPayment,
	listPaymentAccounts: paymentsMocks.listPaymentAccounts,
	listPaymentMethods: paymentsMocks.listPaymentMethods,
	listPayments: paymentsMocks.listPayments,
	reversePayment: paymentsMocks.reversePayment,
}));

vi.mock("@afenda/accounting", () => ({
	postFinancialSourceEvent: accountingMocks.postFinancialSourceEvent,
}));

import { createPayrollPlatformEventHandlers } from "@/modules/platform/domain/payroll-platform-events";

const organizationId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const actorUserId = "a47ac10b-58cc-4372-a567-0e02b2c3d479";
const runId = "b47ac10b-58cc-4372-a567-0e02b2c3d479";

function buildEvent(
	type: string,
	payload: Record<string, unknown>,
): DomainEvent {
	return {
		id: "c47ac10b-58cc-4372-a567-0e02b2c3d479",
		type,
		sourceModule: "payroll",
		organizationId,
		actorUserId,
		correlationId: "corr-1",
		causationId: null,
		deduplicationKey: null,
		payload,
		metadata: {},
		status: "processing",
		attempts: 1,
		lastError: null,
		processedAt: null,
		occurredAt: new Date(),
	};
}

describe("createPayrollPlatformEventHandlers", () => {
	beforeEach(() => {
		auditMocks.record.mockReset();
		paymentsMocks.createDraftPayment.mockReset();
		paymentsMocks.listPaymentAccounts.mockReset();
		paymentsMocks.listPaymentMethods.mockReset();
		paymentsMocks.listPayments.mockReset();
		paymentsMocks.reversePayment.mockReset();
		accountingMocks.postFinancialSourceEvent.mockReset();

		auditMocks.record.mockResolvedValue(errorResult.ok({ id: "audit-1" }));
		paymentsMocks.listPaymentAccounts.mockResolvedValue(
			errorResult.ok([
				{
					id: "d47ac10b-58cc-4372-a567-0e02b2c3d479",
					active: true,
					currencyCode: "USD",
				},
			]),
		);
		paymentsMocks.listPaymentMethods.mockResolvedValue(
			errorResult.ok([
				{
					id: "e47ac10b-58cc-4372-a567-0e02b2c3d479",
					active: true,
					kind: "wire",
				},
			]),
		);
		paymentsMocks.createDraftPayment.mockResolvedValue(
			errorResult.ok({ id: "pay-1" }),
		);
	});

	it("records audit telemetry for lifecycle events", async () => {
		const handlers = createPayrollPlatformEventHandlers();
		const handler = handlers[PAYROLL_RUN_STARTED_EVENT];
		expect(handler).toBeDefined();
		await handler?.(
			buildEvent(PAYROLL_RUN_STARTED_EVENT, {
				organizationId,
				entityType: "payroll_run",
				entityId: runId,
				actorId: actorUserId,
				correlationId: "corr-1",
			}),
		);
		expect(auditMocks.record).toHaveBeenCalledOnce();
		expect(paymentsMocks.createDraftPayment).not.toHaveBeenCalled();
	});

	it("records audit telemetry for final-settlement lifecycle events", async () => {
		const handlers = createPayrollPlatformEventHandlers();
		const handler = handlers[PAYROLL_FINAL_SETTLEMENT_FINALIZED_EVENT];
		expect(handler).toBeDefined();
		await handler?.(
			buildEvent(PAYROLL_FINAL_SETTLEMENT_FINALIZED_EVENT, {
				organizationId,
				entityType: "payroll_final_settlement",
				entityId: runId,
				actorId: actorUserId,
				correlationId: "corr-1",
			}),
		);
		expect(auditMocks.record).toHaveBeenCalledOnce();
		expect(paymentsMocks.createDraftPayment).not.toHaveBeenCalled();
	});

	it("creates draft disbursements for payment-requested events", async () => {
		const handlers = createPayrollPlatformEventHandlers();
		const handler = handlers[PAYROLL_PAYMENT_REQUESTED_EVENT];
		expect(handler).toBeDefined();
		await handler?.(
			buildEvent(PAYROLL_PAYMENT_REQUESTED_EVENT, {
				organizationId,
				entityType: "payroll_run",
				entityId: runId,
				actorId: actorUserId,
				correlationId: "corr-1",
				payGroupId: "047ac10b-58cc-4372-a567-0e02b2c3d479",
				periodId: "147ac10b-58cc-4372-a567-0e02b2c3d479",
				calculationSnapshotHash: "hash-1",
				calculationVersion: "v1",
				paymentDate: "2026-08-01",
				payments: [
					{
						employeeId: "emp-1",
						sourceId: "247ac10b-58cc-4372-a567-0e02b2c3d479",
						amount: "1000.00",
						currencyCode: "USD",
					},
				],
			}),
		);
		expect(paymentsMocks.createDraftPayment).toHaveBeenCalledOnce();
		expect(auditMocks.record).not.toHaveBeenCalled();
	});
});
