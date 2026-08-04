const MAX_SAFE_FIELD_PATH_LENGTH = 128 as const;
const SAFE_FIELD_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function normalizeSafeFieldPath(
	path: readonly PropertyKey[],
): string | undefined {
	if (path.length === 0 || typeof path[0] !== "string") {
		return;
	}

	let normalized = "";

	for (const segment of path) {
		if (typeof segment === "string") {
			if (!SAFE_FIELD_NAME_PATTERN.test(segment)) {
				return;
			}

			normalized += normalized.length === 0 ? segment : `.${segment}`;
		} else if (
			typeof segment === "number" &&
			Number.isSafeInteger(segment) &&
			segment >= 0
		) {
			normalized += `[${segment}]`;
		} else {
			return;
		}

		if (normalized.length > MAX_SAFE_FIELD_PATH_LENGTH) {
			return;
		}
	}

	return normalized;
}
