import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import type { AnyPgTable, PgColumn } from "drizzle-orm/pg-core";
import { getNeonSql } from "./http-transaction";
import * as schema from "./schema";

export type DbSchema = typeof schema;

function createDb() {
	return drizzle(getNeonSql(), { schema });
}

export type Database = ReturnType<typeof createDb>;

let cached: Database | undefined;

/**
 * Neon HTTP Drizzle client (ARCH-025).
 * Lazy: no connection until first property access.
 * Product class: pooled DATABASE_URL only (N2).
 */
export const db: Database = new Proxy({} as Database, {
	get(_target, property, receiver) {
		cached ??= createDb();
		const value = Reflect.get(cached, property, receiver);
		return typeof value === "function" ? value.bind(cached) : value;
	},
});

/** Tables that carry `organization_id` (Living tenant roots + scoped platform rows). */
export type TenantTable = AnyPgTable & {
	organizationId: PgColumn;
};

/**
 * Documented tenant read entry point (ARCH-023 · ARCH-025 · ARCH-028 S2.2).
 *
 * Hard predicate only: `organization_id = $orgId`.
 * App code must not call `db.select()` on tenant tables without this helper.
 * Writes use `db.insert` / `update` / `delete` with explicit `organizationId`.
 *
 * `from` cast: Drizzle selection generics reject `AnyPgTable` intersections;
 * runtime table identity is unchanged. Return type is `T["$inferSelect"][]`
 * so callers see the concrete table row shape (S7.4 feature shells).
 */
export async function withOrg<T extends TenantTable>(
	table: T,
	orgId: string,
): Promise<T["$inferSelect"][]> {
	const trimmed = orgId.trim();
	if (trimmed.length === 0) {
		throw new Error("withOrg requires non-empty orgId");
	}
	const rows = await db
		.select()
		.from(table as unknown as typeof schema.platformRoleAssignment)
		.where(eq(table.organizationId, trimmed));
	return rows as T["$inferSelect"][];
}
