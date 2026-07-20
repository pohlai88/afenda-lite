import {
	buildContentSecurityPolicy,
	type CspDirectives,
	DEFAULT_CSP_DIRECTIVES,
	STRICT_CSP_DIRECTIVES,
} from "./csp";

export type NextSecurityHeader = {
	readonly key: string;
	readonly value: string;
};

export type SecurityHeadersConfig = {
	readonly cspDirectives?: CspDirectives;
	readonly includeCsp?: boolean;
	readonly frameAncestors?: readonly string[];
	readonly hsts?: boolean;
	readonly hstsMaxAge?: number;
	readonly hstsIncludeSubdomains?: boolean;
	readonly hstsPreload?: boolean;
	readonly frameOptions?: "DENY" | "SAMEORIGIN";
	readonly referrerPolicy?: string;
	readonly permissionsPolicy?: string;
	readonly reportUri?: string;
	readonly reportTo?: string;
};

export const DNS_PREFETCH_CONTROL_HEADER = "X-DNS-Prefetch-Control" as const;
export const FRAME_OPTIONS_HEADER = "X-Frame-Options" as const;
export const CONTENT_TYPE_OPTIONS_HEADER = "X-Content-Type-Options" as const;
export const REFERRER_POLICY_HEADER = "Referrer-Policy" as const;
export const PERMISSIONS_POLICY_HEADER = "Permissions-Policy" as const;
export const HSTS_HEADER = "Strict-Transport-Security" as const;
export const CSP_HEADER = "Content-Security-Policy" as const;

const DEFAULT_FRAME_OPTIONS = "SAMEORIGIN" as const;
const DEFAULT_REFERRER_POLICY = "strict-origin-when-cross-origin" as const;
const DEFAULT_PERMISSIONS_POLICY =
	"camera=(), microphone=(), geolocation=(), payment=()" as const;
const DEFAULT_HSTS_MAX_AGE = 31536000;
const FRAME_ANCESTORS_NONE = "'none'" as const;

/**
 * Living baseline matching apps/web next.config before package cutover,
 * plus Permissions-Policy. CSP/HSTS remain opt-in via SecurityHeadersConfig.
 */
export const DEFAULT_SECURITY_HEADERS: readonly NextSecurityHeader[] = [
	{ key: DNS_PREFETCH_CONTROL_HEADER, value: "on" },
	{ key: FRAME_OPTIONS_HEADER, value: DEFAULT_FRAME_OPTIONS },
	{ key: CONTENT_TYPE_OPTIONS_HEADER, value: "nosniff" },
	{
		key: REFERRER_POLICY_HEADER,
		value: DEFAULT_REFERRER_POLICY,
	},
	{
		key: PERMISSIONS_POLICY_HEADER,
		value: DEFAULT_PERMISSIONS_POLICY,
	},
] as const;

function isFrameAncestorsNone(
	frameAncestors: readonly string[] | undefined,
): boolean {
	return (
		frameAncestors !== undefined &&
		frameAncestors.length === 1 &&
		frameAncestors[0] === FRAME_ANCESTORS_NONE
	);
}

function resolveFrameOptions(
	config: SecurityHeadersConfig,
): "DENY" | "SAMEORIGIN" {
	if (config.frameOptions !== undefined) {
		return config.frameOptions;
	}
	if (isFrameAncestorsNone(config.frameAncestors)) {
		return "DENY";
	}
	return DEFAULT_FRAME_OPTIONS;
}

function resolveCspDirectives(config: SecurityHeadersConfig): CspDirectives {
	let directives: CspDirectives =
		config.cspDirectives ?? DEFAULT_CSP_DIRECTIVES;

	if (config.frameAncestors !== undefined) {
		directives = {
			...directives,
			"frame-ancestors": config.frameAncestors,
		};
	}

	const reportUri = config.reportUri?.trim();
	if (reportUri !== undefined && reportUri !== "") {
		directives = {
			...directives,
			"report-uri": [reportUri],
		};
	}

	const reportTo = config.reportTo?.trim();
	if (reportTo !== undefined && reportTo !== "") {
		directives = {
			...directives,
			"report-to": [reportTo],
		};
	}

	return directives;
}

function buildHstsValue(config: SecurityHeadersConfig): string {
	const maxAge = config.hstsMaxAge ?? DEFAULT_HSTS_MAX_AGE;
	const includeSub = config.hstsIncludeSubdomains !== false;
	const parts = [`max-age=${maxAge}`];
	if (includeSub) {
		parts.push("includeSubDomains");
	}
	if (config.hstsPreload === true) {
		parts.push("preload");
	}
	return parts.join("; ");
}

/**
 * Next.js `headers()`-shaped security header list.
 */
export function securityHeadersForNext(
	config: SecurityHeadersConfig = {},
): NextSecurityHeader[] {
	const frameOptions = resolveFrameOptions(config);
	const referrerPolicy = config.referrerPolicy ?? DEFAULT_REFERRER_POLICY;
	const permissionsPolicy =
		config.permissionsPolicy ?? DEFAULT_PERMISSIONS_POLICY;

	const headers: NextSecurityHeader[] = DEFAULT_SECURITY_HEADERS.map(
		(header) => {
			if (header.key === FRAME_OPTIONS_HEADER) {
				return { key: header.key, value: frameOptions };
			}
			if (header.key === REFERRER_POLICY_HEADER) {
				return { key: header.key, value: referrerPolicy };
			}
			if (header.key === PERMISSIONS_POLICY_HEADER) {
				return { key: header.key, value: permissionsPolicy };
			}
			return header;
		},
	);

	if (config.includeCsp) {
		headers.push({
			key: CSP_HEADER,
			value: buildContentSecurityPolicy(resolveCspDirectives(config)),
		});
	}

	if (config.hsts) {
		headers.push({
			key: HSTS_HEADER,
			value: buildHstsValue(config),
		});
	}

	return headers;
}

/**
 * Opt-in production hardening: strict CSP, frame DENY, HSTS on.
 * Not wired to living next.config — App Router may still need soft CSP.
 * `includeCsp` stays forced so the preset cannot silently drop CSP.
 */
export function strictSecurityHeadersForNext(
	config: SecurityHeadersConfig = {},
): NextSecurityHeader[] {
	return securityHeadersForNext({
		cspDirectives: STRICT_CSP_DIRECTIVES,
		frameAncestors: [FRAME_ANCESTORS_NONE],
		hsts: true,
		...config,
		includeCsp: true,
	});
}

/**
 * Apply a Next-shaped header list onto Fetch Headers (RH / middleware use).
 */
export function applySecurityHeaders(
	headers: Headers,
	nextHeaders: readonly NextSecurityHeader[] = DEFAULT_SECURITY_HEADERS,
): void {
	for (const { key, value } of nextHeaders) {
		headers.set(key, value);
	}
}
