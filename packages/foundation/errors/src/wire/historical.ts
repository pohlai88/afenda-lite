/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { normalizeRetryAfterSeconds } from "../security/normalize";
import {
	canonicalizeWirePublicData,
	isWireRecord,
	resolveAcceptedErrorCode,
} from "./schema";
import type { ParsedWireFailure } from "./types";

function hasExactLegacyKeys(value: Readonly<Record<string, unknown>>): boolean {
	const keys = Object.keys(value);
	return (
		(keys.length === 2 || keys.length === 3) &&
		Object.hasOwn(value, "code") &&
		Object.hasOwn(value, "message") &&
		keys.every(
			(key) => key === "code" || key === "details" || key === "message",
		)
	);
}

function legacyRateLimitDetails(
	details: unknown,
): Readonly<Record<string, unknown>> | undefined | false {
	if (details === undefined) {
		return;
	}
	if (!isWireRecord(details)) {
		return false;
	}
	const hasLegacy = Object.hasOwn(details, "retryAfter");
	const hasCanonical = Object.hasOwn(details, "retryAfterSeconds");
	if (hasLegacy && hasCanonical) {
		return false;
	}
	if (!(hasLegacy || hasCanonical)) {
		return details;
	}
	const normalized = normalizeRetryAfterSeconds(
		hasLegacy ? details.retryAfter : details.retryAfterSeconds,
	);
	return normalized === undefined
		? false
		: Object.freeze({ retryAfterSeconds: normalized });
}

/** Reads only the one retained pre-v1 flat representation. */
export function parseLegacyFlatFailure(
	input: unknown,
): ParsedWireFailure | undefined {
	if (!(isWireRecord(input) && hasExactLegacyKeys(input))) {
		return;
	}
	if (typeof input.message !== "string") {
		return;
	}
	const code = resolveAcceptedErrorCode(input.code);
	if (code === undefined) {
		return;
	}
	const details =
		code === "RATE_LIMITED"
			? legacyRateLimitDetails(input.details)
			: input.details;
	if (details === false || (details !== undefined && !isWireRecord(details))) {
		return;
	}
	const publicData = canonicalizeWirePublicData(
		code,
		input.message,
		details,
		false,
	);
	return publicData === undefined
		? undefined
		: Object.freeze({ code, publicData });
}
