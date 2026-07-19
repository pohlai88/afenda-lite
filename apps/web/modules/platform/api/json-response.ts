import { retryAfterSeconds } from "@afenda/errors/http";
import { applyRetryAfterHeader } from "@afenda/http";
import { NextResponse } from "next/server";

import {
	API_ERROR_HTTP_STATUS,
	type APIErrorBody,
	type ApiErrorCode,
	apiData,
	apiErrorBody,
} from "@/modules/platform/schemas/api-error";

/**
 * Platform JSON helpers for Route Handlers (API-001 · API-002).
 */

export function jsonData<T>(
	data: T,
	init?: { status?: number; headers?: HeadersInit },
): NextResponse<{ data: T }> {
	return NextResponse.json(apiData(data), {
		status: init?.status ?? 200,
		headers: init?.headers,
	});
}

export function jsonError(
	code: ApiErrorCode,
	message: string,
	details?: unknown,
): NextResponse<APIErrorBody> {
	const retryAfter = retryAfterSeconds(details);
	const headers = new Headers();
	if (retryAfter !== undefined) {
		applyRetryAfterHeader(headers, retryAfter);
	}
	return NextResponse.json(apiErrorBody(code, message, details), {
		status: API_ERROR_HTTP_STATUS[code],
		headers,
	});
}
