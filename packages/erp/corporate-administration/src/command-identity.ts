import { errorResult, type Result } from "@afenda/errors";
import { z } from "zod";
import type { CommandFingerprint, OrganizationId } from "./kernel/brands";
import {
	assertCanonicalJsonValue,
	type CanonicalJsonValue,
	createCanonicalFingerprint,
} from "./kernel/canonical-json";
import { parseCorporateAdministrationInput } from "./parse-input";

const commandIdentitySchema = z
	.string()
	.min(1)
	.max(128)
	.regex(
		/^corporate-administration\.[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/,
		"Expected a canonical Corporate Administration command ID",
	);

export type CorporateAdministrationCommandFingerprintEnvelope<
	TCommandId extends string = string,
> = Readonly<{
	namespace: "corporate-administration";
	organizationId: OrganizationId;
	commandId: TCommandId;
	input: CanonicalJsonValue;
}>;

export type CorporateAdministrationCommandIdentity<
	TCommandId extends string = string,
> = Readonly<{
	envelope: CorporateAdministrationCommandFingerprintEnvelope<TCommandId>;
	fingerprint: CommandFingerprint;
}>;

/**
 * Builds the deterministic command identity for idempotency and replay.
 *
 * Only parsed and normalized input is fingerprinted — never raw transport
 * input — so schema transforms, defaults, canonical decimals (as strings), and
 * canonical dates (as strings) are already applied. `assertCanonicalJsonValue`
 * recursively rejects unsupported values before hashing.
 *
 * The envelope binds `namespace`, `organizationId`, `commandId`, and `input`
 * only; unstable delivery metadata (correlation, causation, request time,
 * actor, authorization, clock) is intentionally excluded. Object key insertion
 * order does not affect the fingerprint: `createCanonicalFingerprint` sorts
 * object keys, while array order remains significant.
 */
export function createCorporateAdministrationCommandFingerprint<
	TCommandId extends string,
	TSchema extends z.ZodType,
>(
	input: Readonly<{
		schema: TSchema;
		organizationId: OrganizationId;
		commandId: TCommandId;
		input: unknown;
	}>,
): Result<CorporateAdministrationCommandIdentity<TCommandId>> {
	const parsedInput = parseCorporateAdministrationInput(
		input.schema,
		input.input,
	);
	if (!parsedInput.ok) {
		return parsedInput;
	}

	if (!commandIdentitySchema.safeParse(input.commandId).success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Corporate Administration command identity is invalid",
		});
	}

	try {
		assertCanonicalJsonValue(parsedInput.data);
	} catch {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Corporate Administration command input is not canonical",
		});
	}

	const envelope: CorporateAdministrationCommandFingerprintEnvelope<TCommandId> =
		Object.freeze({
			namespace: "corporate-administration",
			organizationId: input.organizationId,
			commandId: input.commandId,
			input: parsedInput.data,
		});

	const identity: CorporateAdministrationCommandIdentity<TCommandId> =
		Object.freeze({
			envelope,
			fingerprint: createCanonicalFingerprint(envelope),
		});

	return errorResult.ok(identity);
}
