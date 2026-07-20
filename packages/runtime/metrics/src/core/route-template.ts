/**
 * Route template validation - pure function, no runtime dependencies.
 * Accept only low-cardinality path templates — never raw URLs or query strings.
 */
export function assertRouteTemplate(routeTemplate: string): string {
	const trimmed = routeTemplate.trim();
	if (trimmed.length === 0) {
		throw new Error(
			"@afenda/metrics: routeTemplate must be a non-empty path template",
		);
	}
	if (trimmed.includes("?") || trimmed.includes("://")) {
		throw new Error(
			"@afenda/metrics: routeTemplate must not include query strings or absolute URLs",
		);
	}
	return trimmed;
}
