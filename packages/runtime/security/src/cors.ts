import { SECURITY_SEMANTIC_REGISTRY } from "./semantic-registry";

const HEADER_NAME_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const METHOD_PATTERN = /^[A-Z]+$/;

export interface CorsConfig {
	readonly allowedHeaders?: readonly string[];
	readonly credentials?: boolean;
	readonly exposedHeaders?: readonly string[];
	readonly maxAgeSeconds?: number;
	readonly methods?: readonly string[];
	readonly origins: readonly string[];
}

export interface ResolvedCorsConfig {
	readonly allowedHeaders: readonly string[];
	readonly credentials?: boolean;
	readonly exposedHeaders?: readonly string[];
	readonly maxAgeSeconds: number;
	readonly methods: readonly string[];
	readonly origins: readonly string[];
}

export interface BuildCorsHeadersInput {
	readonly config: CorsConfig;
	readonly requestOrigin: string | null;
}

export interface HandleCorsPreflightInput {
	readonly config: CorsConfig;
	readonly request: Request;
}

function normalizeOrigins(origins: readonly string[]): string[] {
	const normalized = new Set<string>();
	for (const origin of origins) {
		const trimmed = origin.trim();
		if (trimmed === "" || trimmed === "*") {
			throw new RangeError(
				"@afenda/security CORS requires explicit non-blank origins",
			);
		}
		let url: URL;
		try {
			url = new URL(trimmed);
		} catch (cause) {
			throw new RangeError(
				"@afenda/security CORS origin must be an absolute URL",
				{ cause },
			);
		}
		if (
			(url.protocol !== "https:" && url.protocol !== "http:") ||
			url.origin !== trimmed
		) {
			throw new RangeError(
				"@afenda/security CORS origin must be an exact HTTP origin",
			);
		}
		normalized.add(url.origin);
	}
	return [...normalized];
}

function normalizeTokens(
	values: readonly string[],
	pattern: RegExp,
	label: string,
): string[] {
	const normalized = new Set<string>();
	for (const value of values) {
		const trimmed = value.trim();
		if (!pattern.test(trimmed)) {
			throw new RangeError(
				`@afenda/security CORS ${label} contains an unsafe token`,
			);
		}
		normalized.add(trimmed);
	}
	return [...normalized];
}

function normalizeMaxAge(value: number): number {
	if (!Number.isSafeInteger(value) || value < 0) {
		throw new RangeError(
			"@afenda/security CORS max age must be a non-negative safe integer",
		);
	}
	return value;
}

export function createCorsConfig(config: CorsConfig): ResolvedCorsConfig {
	const { defaults } = SECURITY_SEMANTIC_REGISTRY.cors;
	return {
		origins: normalizeOrigins(config.origins),
		methods: normalizeTokens(
			config.methods ?? defaults.methods,
			METHOD_PATTERN,
			"methods",
		),
		allowedHeaders: normalizeTokens(
			config.allowedHeaders ?? defaults.allowedHeaders,
			HEADER_NAME_PATTERN,
			"allowed headers",
		),
		maxAgeSeconds: normalizeMaxAge(
			config.maxAgeSeconds ?? defaults.maxAgeSeconds,
		),
		...(config.credentials === undefined
			? {}
			: { credentials: config.credentials }),
		...(config.exposedHeaders === undefined
			? {}
			: {
					exposedHeaders: normalizeTokens(
						config.exposedHeaders,
						HEADER_NAME_PATTERN,
						"exposed headers",
					),
				}),
	};
}

function resolveAllowedOrigin(
	origins: readonly string[],
	requestOrigin: string | null,
): string | null {
	if (requestOrigin === null) {
		return null;
	}
	const trimmed = requestOrigin.trim();
	return origins.includes(trimmed) ? trimmed : null;
}

export function buildCorsHeaders(input: BuildCorsHeadersInput): Headers {
	const config = createCorsConfig(input.config);
	const names = SECURITY_SEMANTIC_REGISTRY.cors.headerNames;
	const headers = new Headers();
	const allowedOrigin = resolveAllowedOrigin(
		config.origins,
		input.requestOrigin,
	);
	if (allowedOrigin === null) {
		return headers;
	}
	headers.set(names.allowOrigin, allowedOrigin);
	headers.set(names.allowMethods, config.methods.join(", "));
	headers.set(names.allowHeaders, config.allowedHeaders.join(", "));
	headers.set(names.maxAge, String(config.maxAgeSeconds));
	headers.set(names.vary, "Origin");
	if (config.credentials === true) {
		headers.set(names.allowCredentials, "true");
	}
	if (config.exposedHeaders?.length) {
		headers.set(names.exposeHeaders, config.exposedHeaders.join(", "));
	}
	return headers;
}

export function handleCorsPreflight(
	input: HandleCorsPreflightInput,
): Response | null {
	if (input.request.method !== "OPTIONS") {
		return null;
	}
	const headers = buildCorsHeaders({
		config: input.config,
		requestOrigin: input.request.headers.get("Origin"),
	});
	if (!headers.has(SECURITY_SEMANTIC_REGISTRY.cors.headerNames.allowOrigin)) {
		return new Response(null, { status: 403 });
	}
	return new Response(null, { status: 204, headers });
}
