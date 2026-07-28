import type { Result } from "@afenda/errors/result";
import type { ApprovedPayrollHandoff } from "@afenda/events/schemas";

import type { PayrollDeliveryRecord } from "./types";

export type PayrollDeliveryProducerPort = {
	/** Must deduplicate retries by deliveryId + payloadHash. */
	publish(input: {
		deliveryId: string;
		organizationId: string;
		correlationId: string;
		payloadHash: string;
		payload: ApprovedPayrollHandoff;
		attempt: number;
	}): Promise<Result<{ receiptId: string | null }>>;
};

export type PayrollDeliveryStorePort = {
	findByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<PayrollDeliveryRecord | null>>;
	getById(input: {
		organizationId: string;
		deliveryId: string;
	}): Promise<Result<PayrollDeliveryRecord | null>>;
	listPending(input: {
		organizationId: string;
		limit: number;
	}): Promise<Result<readonly PayrollDeliveryRecord[]>>;
	create(record: PayrollDeliveryRecord): Promise<Result<PayrollDeliveryRecord>>;
	createCorrection(input: {
		source: PayrollDeliveryRecord;
		expectedSourceVersion: number;
		correction: PayrollDeliveryRecord;
	}): Promise<Result<PayrollDeliveryRecord>>;
	update(input: {
		organizationId: string;
		deliveryId: string;
		expectedVersion: number;
		next: PayrollDeliveryRecord;
	}): Promise<Result<PayrollDeliveryRecord>>;
};

export type PayrollDeliveryClockPort = {
	now(): Date;
};

export type PayrollDeliveryPorts = {
	producer: PayrollDeliveryProducerPort;
	store: PayrollDeliveryStorePort;
	clock: PayrollDeliveryClockPort;
};
