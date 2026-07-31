import type { Result } from "@afenda/errors";

import type {
	CommandFingerprint,
	IdempotencyKey,
	IdempotencyReservationToken,
	OrganizationId,
} from "./kernel/brands";
import type { CanonicalJsonValue } from "./kernel/canonical-json";
import type { CorporateAdministrationTransactionContext } from "./ports";

export type CorporateAdministrationIdempotencyScope = Readonly<{
	organizationId: OrganizationId;
	commandId: string;
	idempotencyKey: IdempotencyKey;
}>;

export type CorporateAdministrationIdempotencyBeginInput = Readonly<{
	scope: CorporateAdministrationIdempotencyScope;
	fingerprint: CommandFingerprint;
}>;

/**
 * Every member is a valid idempotency lifecycle decision, never an adapter
 * failure. A database outage must surface as a `Result` failure so adapters
 * cannot disguise unavailability as `in_progress`.
 *
 * `replay.result` carries the successful command value only. Failed commands
 * release the reservation instead of storing a serialized failure envelope.
 */
export type CorporateAdministrationIdempotencyBeginOutcome =
	| Readonly<{
			status: "acquired";
			reservationToken: IdempotencyReservationToken;
	  }>
	| Readonly<{
			status: "replay";
			result: CanonicalJsonValue;
	  }>
	| Readonly<{ status: "in_progress" }>
	| Readonly<{
			status: "conflict";
			existingFingerprint: CommandFingerprint;
	  }>;

export type CorporateAdministrationIdempotencyCompletionInput = Readonly<{
	scope: CorporateAdministrationIdempotencyScope;
	fingerprint: CommandFingerprint;
	reservationToken: IdempotencyReservationToken;
	result: CanonicalJsonValue;
	transaction?: CorporateAdministrationTransactionContext;
}>;

export type CorporateAdministrationIdempotencyReleaseInput = Readonly<{
	scope: CorporateAdministrationIdempotencyScope;
	fingerprint: CommandFingerprint;
	reservationToken: IdempotencyReservationToken;
}>;

/**
 * Adapter doctrine.
 *
 * `complete` and `release` succeed only when scope, fingerprint, and
 * reservation token all match the persisted record. Token equality alone is
 * insufficient, and a rejected call must leave the active record untouched.
 *
 * `release` returns the key to a retryable state while retaining the original
 * fingerprint. The same key with the same fingerprint may acquire again; the
 * same key with a different fingerprint stays a conflict. Discarding the
 * fingerprint on release would let a second request reuse the key with
 * different input and defeat the idempotency guarantee. A superseded token can
 * no longer complete or release, and no expiry or takeover path exists.
 */
export type CorporateAdministrationIdempotencyPort = Readonly<{
	begin: (
		input: CorporateAdministrationIdempotencyBeginInput,
	) => Promise<Result<CorporateAdministrationIdempotencyBeginOutcome>>;
	complete: (
		input: CorporateAdministrationIdempotencyCompletionInput,
	) => Promise<Result<void>>;
	release: (
		input: CorporateAdministrationIdempotencyReleaseInput,
	) => Promise<Result<void>>;
}>;
