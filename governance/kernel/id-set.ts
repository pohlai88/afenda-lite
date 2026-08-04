/**
 * Build a type-narrowing membership guard over a frozen `as const` id list.
 * Uses Set lookup so callers do not reimplement `as readonly string[]` + includes.
 */
export const createIdGuard = <const Ids extends readonly string[]>(
	ids: Ids,
): ((value: string) => value is Ids[number]) => {
	const set: ReadonlySet<string> = new Set(ids);
	return (value: string): value is Ids[number] => set.has(value);
};
