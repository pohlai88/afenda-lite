import { AppError } from "@afenda/errors";
import { projectHttpError } from "@afenda/errors/http";
import { applyRetryAfterHeader } from "@afenda/http";
import { NextResponse } from "next/server";

import {
	type APIErrorBody,
	type ApiErrorCode,
	apiData,
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
		...(init?.headers === undefined ? {} : { headers: init.headers }),
	});
}

export function jsonError(
	code: ApiErrorCode,
	message: string,
	details?: unknown,
	init?: { headers?: HeadersInit },
): NextResponse<APIErrorBody> {
	return jsonAppError(new AppError({ code, message, details }), init);
}

export function jsonAppError(
	error: AppError,
	init?: { headers?: HeadersInit },
): NextResponse<APIErrorBody> {
	const projection = projectHttpError(error);
	const headers = new Headers(init?.headers);
	if (projection.retryAfter !== undefined) {
		applyRetryAfterHeader(headers, projection.retryAfter);
	}
	return NextResponse.json(projection.body, {
		status: projection.status,
		headers,
	});
}
