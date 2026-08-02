import { errorResult, type Result } from "@afenda/errors";

import { mapConflict } from "../execution/persistence-errors";

export interface IdempotentEntityRecord<TEntity> {
	createRequestFingerprint: string;
	entity: TEntity;
}

/** Tenant-scoped key used by deterministic in-memory adapters. */
export function idempotencyMapKey(
	organizationId: string,
	idempotencyKey: string,
): string {
	return `${organizationId}:${idempotencyKey}`;
}

export function resolveSourceIdempotentReplay<TEntity>(input: {
	existing: {
		entity: TEntity;
		sourceRequestFingerprint: string;
	} | null;
	requestFingerprint: string;
}): Result<TEntity | "create"> {
	if (input.existing === null) {
		return errorResult.ok("create");
	}
	if (input.existing.sourceRequestFingerprint !== input.requestFingerprint) {
		return mapConflict("External source input payload mismatch");
	}
	return errorResult.ok(input.existing.entity);
}

export function resolveCreateIdempotentReplay<TEntity>(input: {
	existing: {
		entity: TEntity;
		createRequestFingerprint: string;
	} | null;
	requestFingerprint: string;
}): Result<TEntity | "create"> {
	if (input.existing === null) {
		return errorResult.ok("create");
	}
	if (input.existing.createRequestFingerprint !== input.requestFingerprint) {
		return mapConflict("Idempotency key conflict");
	}
	return errorResult.ok(input.existing.entity);
}
