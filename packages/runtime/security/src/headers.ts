import { buildContentSecurityPolicy, type CspDirectives } from "./csp";
import { SECURITY_SEMANTIC_REGISTRY } from "./semantic-registry";

export interface SecurityHeader {
	readonly name: string;
	readonly value: string;
}

export interface SecurityHeadersOptions {
	readonly cspDirectives?: CspDirectives;
	readonly frameAncestors?: readonly string[];
	readonly frameOptions?: "DENY" | "SAMEORIGIN";
	readonly hsts?: boolean;
	readonly hstsIncludeSubdomains?: boolean;
	readonly hstsMaxAge?: number;
	readonly hstsPreload?: boolean;
	readonly includeCsp?: boolean;
	readonly permissionsPolicy?: string;
	readonly referrerPolicy?: string;
	readonly reportTo?: string;
	readonly reportUri?: string;
}

const FRAME_ANCESTORS_NONE = "'none'";
const HEADER_LINE_BREAK_PATTERN = /[\r\n]/;

function safeHeaderValue(value: string, label: string): string {
	const normalized = value.trim();
	if (normalized === "" || HEADER_LINE_BREAK_PATTERN.test(normalized)) {
		throw new RangeError(
			`@afenda/security ${label} must be a safe header value`,
		);
	}
	return normalized;
}

function nonNegativeInteger(value: number, label: string): number {
	if (!Number.isSafeInteger(value) || value < 0) {
		throw new RangeError(
			`@afenda/security ${label} must be a non-negative safe integer`,
		);
	}
	return value;
}

function resolveFrameOptions(
	options: SecurityHeadersOptions,
): "DENY" | "SAMEORIGIN" {
	if (options.frameOptions !== undefined) {
		return options.frameOptions;
	}
	return options.frameAncestors?.length === 1 &&
		options.frameAncestors[0] === FRAME_ANCESTORS_NONE
		? "DENY"
		: SECURITY_SEMANTIC_REGISTRY.headers.defaults.frameOptions;
}

function resolveCspDirectives(options: SecurityHeadersOptions): CspDirectives {
	let directives: CspDirectives =
		options.cspDirectives ?? SECURITY_SEMANTIC_REGISTRY.csp.baseline;
	if (options.frameAncestors !== undefined) {
		directives = { ...directives, "frame-ancestors": options.frameAncestors };
	}
	const reportUri = options.reportUri?.trim();
	if (reportUri) {
		directives = { ...directives, "report-uri": [reportUri] };
	}
	const reportTo = options.reportTo?.trim();
	if (reportTo) {
		directives = { ...directives, "report-to": [reportTo] };
	}
	return directives;
}

function buildHstsValue(options: SecurityHeadersOptions): string {
	const maxAge = nonNegativeInteger(
		options.hstsMaxAge ??
			SECURITY_SEMANTIC_REGISTRY.headers.defaults.hstsMaxAge,
		"HSTS max age",
	);
	const parts = [`max-age=${maxAge}`];
	if (options.hstsIncludeSubdomains !== false) {
		parts.push("includeSubDomains");
	}
	if (options.hstsPreload === true) {
		parts.push("preload");
	}
	return parts.join("; ");
}

export function createSecurityHeaders(
	options: SecurityHeadersOptions = {},
): SecurityHeader[] {
	const { defaults, names } = SECURITY_SEMANTIC_REGISTRY.headers;
	const entries: SecurityHeader[] = [
		{ name: names.dnsPrefetchControl, value: defaults.dnsPrefetchControl },
		{ name: names.frameOptions, value: resolveFrameOptions(options) },
		{ name: names.contentTypeOptions, value: defaults.contentTypeOptions },
		{
			name: names.referrerPolicy,
			value: safeHeaderValue(
				options.referrerPolicy ?? defaults.referrerPolicy,
				"Referrer-Policy",
			),
		},
		{
			name: names.permissionsPolicy,
			value: safeHeaderValue(
				options.permissionsPolicy ?? defaults.permissionsPolicy,
				"Permissions-Policy",
			),
		},
	];
	if (options.includeCsp === true) {
		entries.push({
			name: names.contentSecurityPolicy,
			value: buildContentSecurityPolicy(resolveCspDirectives(options)),
		});
	}
	if (options.hsts === true) {
		entries.push({
			name: names.strictTransportSecurity,
			value: buildHstsValue(options),
		});
	}
	return entries;
}

export function createStrictSecurityHeaders(
	options: SecurityHeadersOptions = {},
): SecurityHeader[] {
	return createSecurityHeaders({
		cspDirectives: SECURITY_SEMANTIC_REGISTRY.csp.strict,
		frameAncestors: [FRAME_ANCESTORS_NONE],
		hsts: true,
		...options,
		includeCsp: true,
	});
}

export function applySecurityHeaders(
	headers: Headers,
	entries: readonly SecurityHeader[] = createSecurityHeaders(),
): void {
	for (const { name, value } of entries) {
		headers.set(name, value);
	}
}
