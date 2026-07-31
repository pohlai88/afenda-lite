export const HTTP_SEMANTIC_REGISTRY = {
	headers: {
		correlation: "x-correlation-id",
		retryAfter: "Retry-After",
		rateLimit: {
			limit: "X-RateLimit-Limit",
			remaining: "X-RateLimit-Remaining",
			reset: "X-RateLimit-Reset",
		},
		serverTiming: "Server-Timing",
	},
	pagination: {
		defaultLimit: 20,
		maxLimit: 100,
	},
	serverTiming: {
		defaultMetric: "app",
	},
} as const;
