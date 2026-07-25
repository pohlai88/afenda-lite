import { ok, type Result } from "@afenda/errors/result";

import { CA_IDEMPOTENCY_FINGERPRINT_CONFLICT_MESSAGE } from "../error-codes";
import {
	CorporateAdministrationIdempotencyConflictError,
	mapCorporateAdministrationStoreError,
} from "../store/store-errors";

export { CA_IDEMPOTENCY_FINGERPRINT_CONFLICT_MESSAGE };

export function idempotencyFingerprintConflict(input?: {
	organizationId: string;
	idempotencyKey: string;
}): Result<never> {
	return mapCorporateAdministrationStoreError(
		new CorporateAdministrationIdempotencyConflictError({
			organizationId: input?.organizationId ?? "",
			idempotencyKey: input?.idempotencyKey ?? "",
		}),
	);
}

export function replayIdempotencyFingerprint<
	T extends { requestFingerprint: string },
>(existing: T, requestFingerprint: string): Result<T> {
	if (existing.requestFingerprint === requestFingerprint) {
		return ok(existing);
	}
	return idempotencyFingerprintConflict();
}

export function replayIdempotencyFingerprintMapped<
	Row extends { requestFingerprint: string },
	Value,
>(
	row: Row,
	requestFingerprint: string,
	mapper: (row: Row) => Value,
): Result<Value> {
	if (row.requestFingerprint !== requestFingerprint) {
		return idempotencyFingerprintConflict();
	}
	return ok(mapper(row));
}
