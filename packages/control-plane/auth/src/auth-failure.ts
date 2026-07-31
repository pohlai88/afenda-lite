import { errorProject, errorResult, type ResultFailure } from "@afenda/errors";

import { NextResponse } from "next/server";

const NEON_ORG_CONFLICT_PATTERN = /slug taken|already exists|conflict/i;
const NEON_ORG_FORBIDDEN_PATTERN =
	/unauthor|forbidden|denied|not owner|not permitted/i;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function readStringProperty(value: unknown, key: PropertyKey): string {
	if (!isRecord(value)) {
		return "";
	}
	try {
		const property = Reflect.get(value, key);
		return typeof property === "string" ? property : "";
	} catch {
		return "";
	}
}

/** Safe message probe from Neon SDK / fetch-shaped errors — never returned as public text. */
export function neonErrorProbe(error: unknown): string {
	if (error instanceof Error && error.message.trim().length > 0) {
		return error.message.trim();
	}
	return readStringProperty(error, "message").trim();
}

/**
 * Map Neon organization / invite failure probes to stable `@afenda/errors` codes.
 * Public messages stay product-safe (no driver / token leakage).
 */
export function failFromNeonOrgProbe(
	error: unknown,
	_fallbackMessage: string,
): ResultFailure {
	const probe = neonErrorProbe(error);
	if (NEON_ORG_CONFLICT_PATTERN.test(probe)) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Organization already exists",
		});
	}
	if (NEON_ORG_FORBIDDEN_PATTERN.test(probe)) {
		return errorResult.fail("FORBIDDEN");
	}
	return errorResult.fail("INTERNAL_ERROR");
}

/** Map Neon Auth invite HTTP status to a closed ErrorCode + safe message. */
export function failFromInviteHttpStatus(status: number): ResultFailure {
	if (status === 401) {
		return errorResult.fail("UNAUTHORIZED");
	}
	if (status === 403) {
		return errorResult.fail("FORBIDDEN");
	}
	if (status === 404) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "Invitation target was not found",
		});
	}
	if (status === 409) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Invitation already exists for this member",
		});
	}
	if (status === 429) {
		return errorResult.fail("RATE_LIMITED");
	}
	if (status >= 500) {
		return errorResult.fail("SERVICE_UNAVAILABLE");
	}
	return errorResult.fail("INTERNAL_ERROR");
}

/** Plain-text bridge derived from the canonical HTTP projection. */
export function authPlainTextFailure(failure: ResultFailure): NextResponse {
	const projection = errorProject.http(failure);
	return new NextResponse(projection.body.error.message, {
		status: projection.status,
		headers: projection.headers,
	});
}
