export const METRIC_SEMANTIC_REGISTRY = {
	service: "afenda-web",
	labelValues: {
		httpMethods: ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"],
		dbOperations: ["delete", "insert", "select", "transaction", "update"],
		cacheOperations: ["delete", "get", "set"],
		cacheResults: ["hit", "miss"],
	},
	httpRequestDuration: {
		name: "http_request_duration_seconds",
		help: "Duration of HTTP requests in seconds",
		labels: ["method", "route", "status_code", "service"],
		buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
	},
	httpRequestTotal: {
		name: "http_request_total",
		help: "Total number of HTTP requests",
		labels: ["method", "route", "status_code", "service"],
	},
	dbQueryDuration: {
		name: "db_query_duration_seconds",
		help: "Duration of database queries in seconds",
		labels: ["operation", "table", "service"],
		buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
	},
	cacheAccessTotal: {
		name: "cache_access_total",
		help: "Total number of cache access operations",
		labels: ["operation", "result", "service"],
	},
} as const;
