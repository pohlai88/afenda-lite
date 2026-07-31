/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

const resultContexts = new WeakMap<object, unknown>();

export function attachResultContext(result: object, context: unknown): void {
	if (context !== undefined) {
		resultContexts.set(result, context);
	}
}

/** Reads trusted in-process context. Context is never part of public/wire data. */
export function resultContext(result: unknown): unknown {
	return typeof result === "object" && result !== null
		? resultContexts.get(result)
		: undefined;
}

/** Attaches trusted in-process context without changing the Result value. */
export function withResultContext<T extends object>(
	result: T,
	context: unknown,
): T {
	attachResultContext(result, context);
	return result;
}
