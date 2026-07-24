import { ok, type Result } from "@afenda/errors/result";

import { mapConflict } from "./persistence-errors";

export function resolveSourceIdempotentReplay<TEntity>(input: {
	existing: {
		entity: TEntity;
		sourceRequestFingerprint: string;
	} | null;
	requestFingerprint: string;
}): Result<TEntity | "create"> {
	if (input.existing === null) {
		return ok("create");
	}
	if (
		input.existing.sourceRequestFingerprint !== input.requestFingerprint
	) {
		return mapConflict("External source input payload mismatch");
	}
	return ok(input.existing.entity);
}

export function resolveCreateIdempotentReplay<TEntity>(input: {
	existing: {
		entity: TEntity;
		createRequestFingerprint: string;
	} | null;
	requestFingerprint: string;
}): Result<TEntity | "create"> {
	if (input.existing === null) {
		return ok("create");
	}
	if (
		input.existing.createRequestFingerprint !== input.requestFingerprint
	) {
		return mapConflict("Idempotency key conflict");
	}
	return ok(input.existing.entity);
}
