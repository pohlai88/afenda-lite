export const ACCESS_CONTROL_ALLOW_ORIGIN =
	"Access-Control-Allow-Origin" as const;
export const ACCESS_CONTROL_ALLOW_METHODS =
	"Access-Control-Allow-Methods" as const;
export const ACCESS_CONTROL_ALLOW_HEADERS =
	"Access-Control-Allow-Headers" as const;
export const ACCESS_CONTROL_ALLOW_CREDENTIALS =
	"Access-Control-Allow-Credentials" as const;
export const ACCESS_CONTROL_MAX_AGE = "Access-Control-Max-Age" as const;
export const ACCESS_CONTROL_EXPOSE_HEADERS =
	"Access-Control-Expose-Headers" as const;
export const VARY_HEADER = "Vary" as const;

const DEFAULT_METHODS = [
	"GET",
	"HEAD",
	"POST",
	"PUT",
	"PATCH",
	"DELETE",
	"OPTIONS",
] as const;
const DEFAULT_ALLOWED_HEADERS = [
	"Accept",
	"Authorization",
	"Content-Type",
	"x-correlation-id",
] as const;
const DEFAULT_MAX_AGE_SECONDS = 600;

export type CorsConfig = {
	readonly origins: readonly string[];
	readonly methods?: readonly string[];
	readonly allowedHeaders?: readonly string[];
	readonly exposedHeaders?: readonly string[];
	readonly credentials?: boolean;
	readonly maxAgeSeconds?: number;
};

/** CorsConfig after origin validation and default fill. */
export type ResolvedCorsConfig = {
	readonly origins: readonly string[];
	readonly methods: readonly string[];
	readonly allowedHeaders: readonly string[];
	readonly maxAgeSeconds: number;
	readonly credentials?: boolean;
	readonly exposedHeaders?: readonly string[];
};

export type BuildCorsHeadersInput = {
	readonly config: CorsConfig;
	readonly requestOrigin: string | null;
};

export type HandleCorsPreflightInput = {
	readonly request: Request;
	readonly config: CorsConfig;
};

function normalizeOrigins(origins: readonly string[]): string[] {
	const normalized: string[] = [];
	for (const origin of origins) {
		const trimmed = origin.trim();
		if (trimmed === "") {
			throw new Error(
				"@afenda/security CORS rejects blank origin entries in the allow-list",
			);
		}
		if (trimmed === "*") {
			throw new Error(
				"@afenda/security CORS rejects wildcard origins; pass an explicit allow-list",
			);
		}
		normalized.push(trimmed);
	}
	return normalized;
}

function resolveAllowedOrigin(
	origins: readonly string[],
	requestOrigin: string | null,
): string | null {
	if (requestOrigin === null || requestOrigin.trim() === "") {
		return null;
	}
	const trimmed = requestOrigin.trim();
	return origins.includes(trimmed) ? trimmed : null;
}

/**
 * Validate origins and fill CORS defaults. Does not read process.env.
 */
export function createCorsConfig(config: CorsConfig): ResolvedCorsConfig {
	return {
		origins: normalizeOrigins(config.origins),
		methods: config.methods ?? DEFAULT_METHODS,
		allowedHeaders: config.allowedHeaders ?? DEFAULT_ALLOWED_HEADERS,
		maxAgeSeconds: config.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS,
		...(config.credentials !== undefined
			? { credentials: config.credentials }
			: {}),
		...(config.exposedHeaders !== undefined
			? { exposedHeaders: config.exposedHeaders }
			: {}),
	};
}

/**
 * Build CORS response headers for an allow-listed origin.
 * Fail closed: unknown/missing origin → empty Headers (no ACAO).
 */
export function buildCorsHeaders(input: BuildCorsHeadersInput): Headers {
	const config = createCorsConfig(input.config);
	const headers = new Headers();
	const allowedOrigin = resolveAllowedOrigin(
		config.origins,
		input.requestOrigin,
	);
	if (allowedOrigin === null) {
		return headers;
	}

	headers.set(ACCESS_CONTROL_ALLOW_ORIGIN, allowedOrigin);
	headers.set(ACCESS_CONTROL_ALLOW_METHODS, config.methods.join(", "));
	headers.set(ACCESS_CONTROL_ALLOW_HEADERS, config.allowedHeaders.join(", "));
	headers.set(ACCESS_CONTROL_MAX_AGE, String(config.maxAgeSeconds));
	headers.set(VARY_HEADER, "Origin");

	if (config.credentials) {
		headers.set(ACCESS_CONTROL_ALLOW_CREDENTIALS, "true");
	}
	if (config.exposedHeaders !== undefined && config.exposedHeaders.length > 0) {
		headers.set(
			ACCESS_CONTROL_EXPOSE_HEADERS,
			config.exposedHeaders.join(", "),
		);
	}

	return headers;
}

/**
 * Handle CORS preflight. Returns 204 Response when OPTIONS + allow-listed origin;
 * null when the request is not a preflight (caller continues).
 */
export function handleCorsPreflight(
	input: HandleCorsPreflightInput,
): Response | null {
	if (input.request.method !== "OPTIONS") {
		return null;
	}

	const corsHeaders = buildCorsHeaders({
		config: input.config,
		requestOrigin: input.request.headers.get("Origin"),
	});
	if (!corsHeaders.has(ACCESS_CONTROL_ALLOW_ORIGIN)) {
		return new Response(null, { status: 403 });
	}

	return new Response(null, {
		status: 204,
		headers: corsHeaders,
	});
}
