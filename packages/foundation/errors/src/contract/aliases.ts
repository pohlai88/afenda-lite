/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

/**
 * Historical aliases are ingress-only data. Lane 1 intentionally starts with
 * no accepted aliases; invalid legacy `INTERNAL` is reserved, not accepted.
 */
export const HISTORICAL_ERROR_ALIASES = Object.freeze({});

/** Derives each definition's compatibility projection from the sole ledger. */
export function aliasesFor(code: string): readonly string[] {
	return Object.freeze(
		Object.entries(HISTORICAL_ERROR_ALIASES)
			.filter(([, canonicalCode]) => canonicalCode === code)
			.map(([alias]) => alias),
	);
}

/** Historical names that can never be reassigned to a new canonical meaning. */
export const RESERVED_HISTORICAL_ERROR_NAMES = Object.freeze([
	"INTERNAL",
] as const);
