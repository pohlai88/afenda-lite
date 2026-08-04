// biome-ignore-all lint/suspicious/useAwait: The deterministic helper implements the asynchronous idempotency port.
import type {
	CorporateAdministrationIdempotencyBeginInput,
	CorporateAdministrationIdempotencyBeginOutcome,
	CorporateAdministrationIdempotencyCompletionInput,
	CorporateAdministrationIdempotencyPort,
	CorporateAdministrationIdempotencyReleaseInput,
} from "@afenda/corporate-administration";
import { idempotencyReservationTokenSchema } from "@afenda/corporate-administration";
import { errorResult, type Result } from "@afenda/errors";
import type {
	CommandFingerprint,
	IdempotencyReservationToken,
} from "../../src/kernel/brands";
import {
	type CanonicalJsonValue,
	toImmutableCanonicalJson,
} from "../../src/kernel/canonical-json";

type InProgressRecord = Readonly<{
	status: "in_progress";
	fingerprint: CommandFingerprint;
	reservationToken: IdempotencyReservationToken;
}>;

type CompletedRecord = Readonly<{
	status: "completed";
	fingerprint: CommandFingerprint;
	result: CanonicalJsonValue;
}>;

type ReleasedRecord = Readonly<{
	status: "released";
	fingerprint: CommandFingerprint;
}>;

type MemoryRecord = InProgressRecord | CompletedRecord | ReleasedRecord;

function storageKey(
	input: CorporateAdministrationIdempotencyBeginInput,
): string {
	return [
		input.scope.organizationId,
		input.scope.commandId,
		input.scope.idempotencyKey,
	].join("\u0000");
}

function conflict(): Result<void> {
	return errorResult.fail("CONFLICT", {
		publicMessage:
			"Corporate Administration idempotency reservation is not owned by this execution",
	});
}

/**
 * In-memory idempotency port for single-process contract tests.
 *
 * Reservation transitions are synchronous `Map` mutations, so they are atomic
 * only inside one process. This makes no cross-process, cross-connection, or
 * cross-request concurrency guarantee and is not a production adapter. Durable
 * reservation, row locking, and serialization behavior belong to the Neon
 * adapter, which must satisfy the same port contract.
 */
export function createMemoryCorporateAdministrationIdempotencyPort(): CorporateAdministrationIdempotencyPort {
	const records = new Map<string, MemoryRecord>();
	let nextReservation = 0;

	return Object.freeze({
		async begin(
			input: CorporateAdministrationIdempotencyBeginInput,
		): Promise<Result<CorporateAdministrationIdempotencyBeginOutcome>> {
			const key = storageKey(input);
			const existing = records.get(key);
			if (existing !== undefined) {
				if (existing.fingerprint !== input.fingerprint) {
					return errorResult.ok(
						Object.freeze({
							status: "conflict",
							existingFingerprint: existing.fingerprint,
						}),
					);
				}
				if (existing.status === "in_progress") {
					return errorResult.ok(Object.freeze({ status: "in_progress" }));
				}
				if (existing.status === "completed") {
					return errorResult.ok(
						Object.freeze({
							status: "replay",
							result: existing.result,
						}),
					);
				}
			}

			nextReservation += 1;
			const reservationToken = idempotencyReservationTokenSchema.parse(
				`reservation_${nextReservation}`,
			);
			records.set(
				key,
				Object.freeze({
					status: "in_progress",
					fingerprint: input.fingerprint,
					reservationToken,
				}),
			);
			return errorResult.ok(
				Object.freeze({
					status: "acquired",
					reservationToken,
				}),
			);
		},

		async complete(
			input: CorporateAdministrationIdempotencyCompletionInput,
		): Promise<Result<void>> {
			const key = storageKey(input);
			const existing = records.get(key);
			if (
				existing?.status !== "in_progress" ||
				existing.fingerprint !== input.fingerprint ||
				existing.reservationToken !== input.reservationToken
			) {
				return conflict();
			}

			let result: CanonicalJsonValue;
			try {
				result = toImmutableCanonicalJson(input.result);
			} catch (error) {
				if (!(error instanceof TypeError)) {
					throw error;
				}
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage:
						"Corporate Administration replay result is not canonical JSON",
				});
			}

			records.set(
				key,
				Object.freeze({
					status: "completed",
					fingerprint: input.fingerprint,
					result,
				}),
			);
			return errorResult.ok(undefined);
		},

		async release(
			input: CorporateAdministrationIdempotencyReleaseInput,
		): Promise<Result<void>> {
			const key = storageKey(input);
			const existing = records.get(key);
			if (
				existing?.status !== "in_progress" ||
				existing.fingerprint !== input.fingerprint ||
				existing.reservationToken !== input.reservationToken
			) {
				return conflict();
			}

			records.set(
				key,
				Object.freeze({
					status: "released",
					fingerprint: existing.fingerprint,
				}),
			);
			return errorResult.ok(undefined);
		},
	});
}
