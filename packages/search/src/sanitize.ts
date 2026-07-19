const SENSITIVE_KEY_PATTERN =
	/password|token|secret|apikey|api_key|authorization|cookie/i;

/**
 * Strip sensitive keys from metadata before index persist.
 * Nested plain objects are walked; arrays are kept only when values are non-objects.
 */
export function sanitizeSearchMetadata(
	metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
	if (metadata === undefined || metadata === null) {
		return null;
	}

	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(metadata)) {
		if (SENSITIVE_KEY_PATTERN.test(key)) {
			continue;
		}
		if (value !== null && typeof value === "object" && !Array.isArray(value)) {
			const nested = sanitizeSearchMetadata(value as Record<string, unknown>);
			if (nested !== null && Object.keys(nested).length > 0) {
				out[key] = nested;
			}
			continue;
		}
		out[key] = value;
	}
	return Object.keys(out).length > 0 ? out : null;
}
