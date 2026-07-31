import { CORRELATION_HEADER, resolveCorrelationId } from "./correlation";

export interface HttpContext {
	readonly correlationId: string;
	readonly startTimeMs: number;
}

export function createHttpContext(request: Request): HttpContext {
	return {
		correlationId: resolveCorrelationId(
			request.headers.get(CORRELATION_HEADER),
		),
		startTimeMs: Date.now(),
	};
}
