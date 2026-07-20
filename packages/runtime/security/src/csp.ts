export type CspDirectives = {
	readonly [directive: string]: readonly string[];
};

/**
 * Build a Content-Security-Policy header value from typed directives.
 */
export function buildContentSecurityPolicy(directives: CspDirectives): string {
	const parts: string[] = [];
	for (const [directive, values] of Object.entries(directives)) {
		if (values.length === 0) {
			parts.push(directive);
			continue;
		}
		parts.push(`${directive} ${values.join(" ")}`);
	}
	return parts.join("; ");
}

/** Baseline CSP suitable for same-origin Afenda App Router shells. */
export const DEFAULT_CSP_DIRECTIVES = {
	"default-src": ["'self'"],
	"base-uri": ["'self'"],
	"frame-ancestors": ["'self'"],
	"object-src": ["'none'"],
	"img-src": ["'self'", "data:", "https:"],
	"font-src": ["'self'", "data:"],
	"style-src": ["'self'", "'unsafe-inline'"],
	"script-src": ["'self'", "'unsafe-inline'"],
	"connect-src": ["'self'", "https:"],
} as const satisfies CspDirectives;

/**
 * Stricter CSP for opt-in production hardening.
 * Not the living next.config baseline — App Router may need unsafe-inline until nonces.
 */
export const STRICT_CSP_DIRECTIVES = {
	"default-src": ["'self'"],
	"base-uri": ["'self'"],
	"frame-ancestors": ["'none'"],
	"object-src": ["'none'"],
	"img-src": ["'self'", "data:"],
	"font-src": ["'self'"],
	"style-src": ["'self'"],
	"script-src": ["'self'", "'strict-dynamic'"],
	"connect-src": ["'self'"],
	"upgrade-insecure-requests": [],
} as const satisfies CspDirectives;
