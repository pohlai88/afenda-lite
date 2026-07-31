/**
 * @afenda/env
 * Contract: ENV-RUNTIME-PROJECTION
 * Protected: changes require local pre-edit token and compatibility checks.
 */

type RuntimeProjection<TRegistry extends Record<string, unknown>> = {
	[K in keyof TRegistry]: string | undefined;
};

/** Read only canonical registry keys from an environment source. */
export function projectRuntimeEnv<
	const TRegistry extends Record<string, unknown>,
>(
	registry: TRegistry,
	source: Readonly<Record<string, string | undefined>>,
): Readonly<RuntimeProjection<TRegistry>> {
	const projection = {} as RuntimeProjection<TRegistry>;
	const keys = Object.keys(registry) as (keyof TRegistry)[];
	for (const key of keys) {
		projection[key] = source[String(key)];
	}
	return Object.freeze(projection);
}
