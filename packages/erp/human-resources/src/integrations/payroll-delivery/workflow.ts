import { createHash, randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";
import {
	type ApprovedPayrollHandoff,
	approvedPayrollHandoffSchema,
} from "@afenda/events/schemas";

import type { PayrollDeliveryPorts } from "./ports";
import {
	isPayrollDeliveryTerminal,
	type PayrollDeliveryRecord,
	type PayrollDeliveryStatus,
} from "./types";

const DEFAULT_MAX_ATTEMPTS = 3;
const MAX_MAX_ATTEMPTS = 10;
const PAYROLL_DELIVERY_PUBLISH_FAILED_MESSAGE =
	"Payroll delivery publish failed";

function canonicalize(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(canonicalize);
	if (value !== null && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, entry]) => [key, canonicalize(entry)]),
		);
	}
	return value;
}

function sha256(value: unknown): string {
	return createHash("sha256")
		.update(JSON.stringify(canonicalize(value)))
		.digest("hex");
}

function validateBoundary(input: {
	organizationId: string;
	correlationId: string;
	payload: ApprovedPayrollHandoff;
}): Result<ApprovedPayrollHandoff> {
	const parsed = approvedPayrollHandoffSchema.safeParse(input.payload);
	if (!parsed.success) {
		return fail("VALIDATION_ERROR", "Invalid approved payroll handoff payload");
	}
	if (parsed.data.organizationId !== input.organizationId) {
		return fail("VALIDATION_ERROR", "Payroll handoff organization mismatch");
	}
	if (parsed.data.approvalEvidence.correlationId !== input.correlationId) {
		return fail("VALIDATION_ERROR", "Payroll handoff correlation mismatch");
	}
	return ok(parsed.data);
}

async function requireDelivery(
	ports: PayrollDeliveryPorts,
	input: { organizationId: string; deliveryId: string; correlationId: string },
): Promise<Result<PayrollDeliveryRecord>> {
	const found = await ports.store.getById(input);
	if (!found.ok) return found;
	if (!found.data) return fail("NOT_FOUND", "Payroll delivery not found");
	if (found.data.correlationId !== input.correlationId) {
		return fail("NOT_FOUND", "Payroll delivery not found");
	}
	return ok(found.data);
}

export async function queuePayrollDelivery(
	input: {
		organizationId: string;
		correlationId: string;
		idempotencyKey: string;
		actorUserId: string;
		payload: ApprovedPayrollHandoff;
		maxAttempts?: number;
		supersedesDeliveryId?: string;
	},
	ports: PayrollDeliveryPorts,
): Promise<Result<PayrollDeliveryRecord>> {
	const boundary = validateBoundary(input);
	if (!boundary.ok) return boundary;
	const maxAttempts = input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
	if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
		return fail(
			"VALIDATION_ERROR",
			`Payroll delivery max attempts must be between 1 and ${MAX_MAX_ATTEMPTS}`,
		);
	}
	const payloadHash = sha256(boundary.data);
	const requestFingerprint = sha256({
		organizationId: input.organizationId,
		correlationId: input.correlationId,
		payloadHash,
		maxAttempts,
		supersedesDeliveryId: input.supersedesDeliveryId ?? null,
	});
	const replay = await ports.store.findByIdempotencyKey(input);
	if (!replay.ok) return replay;
	if (replay.data) {
		return replay.data.requestFingerprint === requestFingerprint
			? ok(replay.data)
			: fail("CONFLICT", "Payroll delivery idempotency conflict");
	}

	let superseded: PayrollDeliveryRecord | null = null;
	if (input.supersedesDeliveryId) {
		const source = await requireDelivery(ports, {
			organizationId: input.organizationId,
			deliveryId: input.supersedesDeliveryId,
			correlationId: input.correlationId,
		});
		if (!source.ok) return source;
		if (source.data.status !== "correction_required") {
			return fail("CONFLICT", "Payroll delivery does not require correction");
		}
		if (source.data.supersededByDeliveryId) {
			return fail("CONFLICT", "Payroll delivery correction already exists");
		}
		if (source.data.payloadHash === payloadHash) {
			return fail("CONFLICT", "Corrected payroll payload must change");
		}
		superseded = source.data;
	}

	const now = ports.clock.now();
	const record: PayrollDeliveryRecord = {
		id: randomUUID(),
		organizationId: input.organizationId,
		correlationId: input.correlationId,
		idempotencyKey: input.idempotencyKey,
		requestFingerprint,
		payloadHash,
		payload: boundary.data,
		status: "pending",
		version: 1,
		attemptCount: 0,
		maxAttempts,
		lastAttemptAt: null,
		lastError: null,
		deliveredAt: null,
		producerReceiptId: null,
		feedbackAt: null,
		feedbackBy: null,
		feedbackReason: null,
		supersedesDeliveryId: input.supersedesDeliveryId ?? null,
		supersededByDeliveryId: null,
		createdBy: input.actorUserId,
		createdAt: now,
		updatedBy: input.actorUserId,
		updatedAt: now,
	};
	const created = superseded
		? await ports.store.createCorrection({
				source: superseded,
				expectedSourceVersion: superseded.version,
				correction: record,
			})
		: await ports.store.create(record);
	if (!created.ok) return created;
	return created;
}

export async function deliverPayrollHandoff(
	input: {
		organizationId: string;
		deliveryId: string;
		correlationId: string;
		actorUserId: string;
	},
	ports: PayrollDeliveryPorts,
): Promise<Result<PayrollDeliveryRecord>> {
	const found = await requireDelivery(ports, input);
	if (!found.ok) return found;
	const current = found.data;
	if (current.status !== "pending") return ok(current);
	if (current.attemptCount >= current.maxAttempts) {
		return fail("CONFLICT", "Payroll delivery attempt limit reached");
	}
	const attempt = current.attemptCount + 1;
	const published = await ports.producer.publish({
		deliveryId: current.id,
		organizationId: current.organizationId,
		correlationId: current.correlationId,
		payloadHash: current.payloadHash,
		payload: current.payload,
		attempt,
	});
	const now = ports.clock.now();
	const next: PayrollDeliveryRecord = published.ok
		? {
				...current,
				status: "delivered",
				attemptCount: attempt,
				lastAttemptAt: now,
				lastError: null,
				deliveredAt: now,
				producerReceiptId: published.data.receiptId,
				version: current.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			}
		: {
				...current,
				status: attempt >= current.maxAttempts ? "failed" : "pending",
				attemptCount: attempt,
				lastAttemptAt: now,
				lastError: PAYROLL_DELIVERY_PUBLISH_FAILED_MESSAGE,
				version: current.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
	return ports.store.update({
		organizationId: current.organizationId,
		deliveryId: current.id,
		expectedVersion: current.version,
		next,
	});
}

export async function recordPayrollDeliveryFeedback(
	input: {
		organizationId: string;
		deliveryId: string;
		correlationId: string;
		actorUserId: string;
		status: "acknowledged" | "rejected" | "correction_required";
		reason?: string;
	},
	ports: PayrollDeliveryPorts,
): Promise<Result<PayrollDeliveryRecord>> {
	const found = await requireDelivery(ports, input);
	if (!found.ok) return found;
	const current = found.data;
	if (current.status === input.status) return ok(current);
	if (
		isPayrollDeliveryTerminal(current.status) ||
		current.status !== "delivered"
	) {
		return fail("CONFLICT", "Payroll delivery cannot accept feedback");
	}
	if (input.status !== "acknowledged" && !input.reason?.trim()) {
		return fail(
			"VALIDATION_ERROR",
			"Payroll delivery feedback reason is required",
		);
	}
	const now = ports.clock.now();
	return ports.store.update({
		organizationId: current.organizationId,
		deliveryId: current.id,
		expectedVersion: current.version,
		next: {
			...current,
			status: input.status,
			feedbackAt: now,
			feedbackBy: input.actorUserId,
			feedbackReason: input.reason?.trim() ?? null,
			version: current.version + 1,
			updatedBy: input.actorUserId,
			updatedAt: now,
		},
	});
}

export function payrollDeliveryStatusIsTerminal(
	status: PayrollDeliveryStatus,
): boolean {
	return isPayrollDeliveryTerminal(status);
}
