/**
 * Canonical ERP identifier vocabulary. Module ids, categories, feature ids, and
 * feature group ids all share one kebab-case rule, so it has one owner rather
 * than a copy inside each scaffold. Callers keep their own assertion and error
 * class; only the predicate is shared.
 */
export const ERP_KEBAB_CASE_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export const isErpKebabCase = (value: string): boolean =>
	ERP_KEBAB_CASE_PATTERN.test(value);

/**
 * Generator answers arrive either from an interactive prompt or positionally
 * from `turbo gen … --args`, so an id is `unknown` until proven otherwise.
 */
export const normalizeErpIdInput = (value: unknown): string =>
	typeof value === "string" ? value.trim() : "";
