import type { ErrorCode } from "@afenda/errors";
import { ERROR_HTTP_STATUS } from "@afenda/errors/http";
import { fail, type ResultFailure } from "@afenda/errors/result";
import { NextResponse } from "next/server";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

/** Safe message probe from Neon SDK / fetch-shaped errors — never returned as public text. */
export function neonErrorProbe(error: unknown): string {
	if (
		isRecord(error) &&
		typeof error.message === "string" &&
		error.message.trim().length > 0
	) {
		return error.message.trim();
	}
	if (error instanceof Error && error.message.trim().length > 0) {
		return error.message.trim();
	}
	return "";
}

/**
 * Map Neon organization / invite failure probes to stable `@afenda/errors` codes.
 * Public messages stay product-safe (no driver / token leakage).
 */
export function failFromNeonOrgProbe(
	error: unknown,
	fallbackMessage: string,
): ResultFailure {
	const probe = neonErrorProbe(error);
	if (/slug taken|already exists|conflict/i.test(probe)) {
		return fail("CONFLICT", "Organization already exists");
	}
	if (/unauthor|forbidden|denied|not owner|not permitted/i.test(probe)) {
		return fail("FORBIDDEN", "Not authorized for this organization action");
	}
	return fail("INTERNAL_ERROR", fallbackMessage);
}

/** Map Neon Auth invite HTTP status to a closed ErrorCode + safe message. */
export function failFromInviteHttpStatus(status: number): ResultFailure {
	if (status === 401) {
		return fail("UNAUTHORIZED", "Invitation could not be authorized");
	}
	if (status === 403) {
		return fail("FORBIDDEN", "Invitation is not permitted for this session");
	}
	if (status === 404) {
		return fail("NOT_FOUND", "Invitation target was not found");
	}
	if (status === 409) {
		return fail("CONFLICT", "Invitation already exists for this member");
	}
	if (status === 429) {
		return fail("RATE_LIMITED", "Invitation rate limit exceeded");
	}
	if (status >= 500) {
		return fail(
			"SERVICE_UNAVAILABLE",
			"Invitation service is temporarily unavailable",
		);
	}
	return fail("INTERNAL_ERROR", "Invitation could not be sent");
}

/** Plain-text RH failure with status from the shared ErrorCode → HTTP map. */
export function authPlainTextFailure(
	code: ErrorCode,
	message: string,
): NextResponse {
	return new NextResponse(message, { status: ERROR_HTTP_STATUS[code] });
}
