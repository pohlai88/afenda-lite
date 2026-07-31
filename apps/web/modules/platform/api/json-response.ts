import { errorProject, type Failure, type ResultFailure } from "@afenda/errors";
import { NextResponse } from "next/server";

import {
	type APIErrorBody,
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

export function jsonFailure(
	error: Failure | ResultFailure,
	init?: { headers?: HeadersInit },
): NextResponse<APIErrorBody> {
	const projection = errorProject.http(error);
	const headers = new Headers(projection.headers);
	if (init?.headers !== undefined) {
		const additionalHeaders = new Headers(init.headers);
		additionalHeaders.forEach((value, name) => {
			headers.set(name, value);
		});
	}
	return NextResponse.json(projection.body, {
		status: projection.status,
		headers,
	});
}
