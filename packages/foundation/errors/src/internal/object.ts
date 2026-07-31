/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

export function readProperty(value: unknown, key: PropertyKey): unknown {
	if (
		(typeof value !== "object" || value === null) &&
		typeof value !== "function"
	) {
		return;
	}

	try {
		return Reflect.get(value, key);
	} catch {
		// Hostile accessors are treated as absent input at the package boundary.
	}
}
