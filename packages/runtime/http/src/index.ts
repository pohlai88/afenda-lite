import { compose } from "./compose";
import { createHttpContext } from "./context";
import {
	CORRELATION_HEADER,
	createCorrelationId,
	isCorrelationId,
	resolveCorrelationId,
} from "./correlation";
import {
	DEFAULT_PAGE_LIMIT,
	extractPagination,
	MAX_PAGE_LIMIT,
} from "./pagination";
import { applyRateLimitHeaders } from "./rate-limit-headers";
import { applyRetryAfterHeader } from "./retry-after";
import { applyServerTimingHeader } from "./server-timing";
import { stampHttpResponse } from "./stamp-response";
import { withHttpContext } from "./with-http-context";

export const http = Object.freeze({
	correlation: Object.freeze({
		header: CORRELATION_HEADER,
		create: createCorrelationId,
		is: isCorrelationId,
		resolve: resolveCorrelationId,
		createContext: createHttpContext,
	}),
	pagination: Object.freeze({
		defaultLimit: DEFAULT_PAGE_LIMIT,
		maxLimit: MAX_PAGE_LIMIT,
		extract: extractPagination,
	}),
	headers: Object.freeze({
		applyRetryAfter: applyRetryAfterHeader,
		applyRateLimit: applyRateLimitHeaders,
		applyServerTiming: applyServerTimingHeader,
	}),
	pipeline: Object.freeze({
		compose,
		withContext: withHttpContext,
	}),
	response: Object.freeze({
		stamp: stampHttpResponse,
	}),
});

export type { HttpHandler, HttpMiddleware } from "./compose";
export type { HttpContext } from "./context";
export type { PaginationParams } from "./pagination";
export type { RateLimitHeaderQuota } from "./rate-limit-headers";
export type { StampHttpResponseOptions } from "./stamp-response";
export type { WithHttpContextOptions } from "./with-http-context";
