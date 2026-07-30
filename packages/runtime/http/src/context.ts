import { CORRELATION_HEADER, resolveCorrelationId } from "./correlation";

export interface HttpContext {
	readonly correlationId: string;
	readonly startTime: number;
}

export function createHttpContext(request: Request): HttpContext {
	return {
		correlationId: resolveCorrelationId(
			request.headers.get(CORRELATION_HEADER),
		),
		startTime: Date.now(),
	};
}
