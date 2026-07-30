const REGISTRY_PATTERN =
	/export const HARD_TENANT_ROOT_ENTRIES = \[([\s\S]*?)\n\s*\] as const;/;
const ENTRY_PATTERN =
	/\[\s*"([a-z][a-z0-9_]*)"\s*,\s*([A-Za-z_$][\w$]*)\s*,?\s*\]/g;

/**
 * Parse the trusted SQL-name ↔ Drizzle-identifier registry without importing
 * TypeScript schema modules into Node operations scripts.
 */
export function parseHardTenantRootEntries(source) {
	const body = source.match(REGISTRY_PATTERN)?.[1];
	if (!body) {
		throw new Error("Could not read HARD_TENANT_ROOT_ENTRIES registry");
	}

	const entries = [...body.matchAll(ENTRY_PATTERN)].map((match) => ({
		sqlName: match[1],
		tableIdentifier: match[2],
	}));
	if (entries.length === 0) {
		throw new Error("HARD_TENANT_ROOT_ENTRIES registry is empty");
	}

	const sqlNames = new Set(entries.map((entry) => entry.sqlName));
	const identifiers = new Set(entries.map((entry) => entry.tableIdentifier));
	if (sqlNames.size !== entries.length || identifiers.size !== entries.length) {
		throw new Error("HARD_TENANT_ROOT_ENTRIES contains duplicate entries");
	}

	return entries;
}
