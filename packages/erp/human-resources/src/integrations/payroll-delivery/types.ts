import type { ApprovedPayrollHandoff } from "@afenda/events/schemas";

export type PayrollDeliveryStatus =
	| "pending"
	| "delivered"
	| "acknowledged"
	| "rejected"
	| "correction_required"
	| "failed";

export type PayrollDeliveryAudit = {
	createdBy: string;
	createdAt: Date;
	updatedBy: string;
	updatedAt: Date;
};

export type PayrollDeliveryRecord = PayrollDeliveryAudit & {
	id: string;
	organizationId: string;
	correlationId: string;
	idempotencyKey: string;
	requestFingerprint: string;
	payloadHash: string;
	payload: ApprovedPayrollHandoff;
	status: PayrollDeliveryStatus;
	version: number;
	attemptCount: number;
	maxAttempts: number;
	lastAttemptAt: Date | null;
	lastError: string | null;
	deliveredAt: Date | null;
	producerReceiptId: string | null;
	feedbackAt: Date | null;
	feedbackBy: string | null;
	feedbackReason: string | null;
	supersedesDeliveryId: string | null;
	supersededByDeliveryId: string | null;
};

export const PAYROLL_DELIVERY_TERMINAL_STATUSES = [
	"acknowledged",
	"rejected",
	"correction_required",
	"failed",
] as const satisfies readonly PayrollDeliveryStatus[];

export function isPayrollDeliveryTerminal(
	status: PayrollDeliveryStatus,
): boolean {
	return PAYROLL_DELIVERY_TERMINAL_STATUSES.includes(
		status as (typeof PAYROLL_DELIVERY_TERMINAL_STATUSES)[number],
	);
}
