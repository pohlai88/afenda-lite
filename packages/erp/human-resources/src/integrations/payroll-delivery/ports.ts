import type { Result } from "@afenda/errors/result";
import type { ApprovedPayrollHandoff } from "@afenda/events/schemas";

import type { PayrollDeliveryRecord } from "./types";

export interface PayrollDeliveryProducerPort {
	/** Must deduplicate retries by deliveryId + payloadHash. */
	publish: (input: {
		deliveryId: string;
		organizationId: string;
		correlationId: string;
		payloadHash: string;
		payload: ApprovedPayrollHandoff;
		attempt: number;
	}) => Promise<Result<{ receiptId: string | null }>>;
}

export interface PayrollDeliveryStorePort {
	create: (
		record: PayrollDeliveryRecord,
	) => Promise<Result<PayrollDeliveryRecord>>;
	createCorrection: (input: {
		source: PayrollDeliveryRecord;
		expectedSourceVersion: number;
		correction: PayrollDeliveryRecord;
	}) => Promise<Result<PayrollDeliveryRecord>>;
	findByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<PayrollDeliveryRecord | null>>;
	getById: (input: {
		organizationId: string;
		deliveryId: string;
	}) => Promise<Result<PayrollDeliveryRecord | null>>;
	listPending: (input: {
		organizationId: string;
		limit: number;
	}) => Promise<Result<readonly PayrollDeliveryRecord[]>>;
	update: (input: {
		organizationId: string;
		deliveryId: string;
		expectedVersion: number;
		next: PayrollDeliveryRecord;
	}) => Promise<Result<PayrollDeliveryRecord>>;
}

export interface PayrollDeliveryClockPort {
	now: () => Date;
}

export interface PayrollDeliveryPorts {
	clock: PayrollDeliveryClockPort;
	producer: PayrollDeliveryProducerPort;
	store: PayrollDeliveryStorePort;
}
