import { createHash } from "node:crypto";
import { errorResult, type Result } from "@afenda/errors";

/**
 * BR-07: an idempotent replay returns the original observable result without
 * duplicate effects; a fingerprint mismatch on the same key is a conflict.
 * Backed by `ca_mutation_receipt` (packages/data-plane/db, CA-specific
 * idempotency infrastructure — not a shared platform capability).
 */
export interface MutationReceiptStore {
	/** Marks a reserved receipt completed with its observable result. */
	complete: (input: {
		organizationId: string;
		commandId: string;
		idempotencyKey: string;
		result: unknown;
	}) => Promise<Result<void>>;
	/** Reserves a receipt row, or returns the completed replay result. */
	reserve: (input: {
		organizationId: string;
		commandId: string;
		idempotencyKey: string;
		fingerprint: string;
	}) => Promise<
		Result<{ status: "reserved" } | { status: "replay"; result: unknown }>
	>;
}

/** Deterministic fingerprint over the business-relevant, caller-controlled input. */
export function fingerprintMutation(input: unknown): string {
	return createHash("sha256").update(canonicalJson(input)).digest("hex");
}

function canonicalJson(value: unknown): string {
	if (value === null || typeof value !== "object") {
		return JSON.stringify(value);
	}
	if (Array.isArray(value)) {
		return `[${value.map(canonicalJson).join(",")}]`;
	}
	const keys = Object.keys(value as Record<string, unknown>).sort();
	return `{${keys
		.map(
			(key) =>
				`${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`,
		)
		.join(",")}}`;
}

/**
 * Reserves the mutation, runs `execute` only if it is genuinely new, and
 * completes the receipt with the observable result. A failing `execute` does
 * not complete the receipt — the operation may be legitimately retried.
 */
export async function withIdempotentExecution<T>(
	store: MutationReceiptStore,
	input: {
		organizationId: string;
		commandId: string;
		idempotencyKey: string;
		fingerprint: string;
	},
	execute: () => Promise<Result<T>>,
): Promise<Result<T>> {
	const reservation = await store.reserve(input);
	if (!reservation.ok) {
		return reservation;
	}
	if (reservation.data.status === "replay") {
		return errorResult.ok(reservation.data.result as T);
	}
	const result = await execute();
	if (result.ok) {
		await store.complete({
			organizationId: input.organizationId,
			commandId: input.commandId,
			idempotencyKey: input.idempotencyKey,
			result: result.data,
		});
	}
	return result;
}
