import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import type { AnyPgColumn, AnyPgTable, PgColumn } from "drizzle-orm/pg-core";
import { databaseSchema } from "./database-schema";
import { getNeonSql } from "./http-transaction";

export type DbSchema = typeof databaseSchema;

function createDb() {
	return drizzle(getNeonSql(), { schema: databaseSchema });
}

export type Database = ReturnType<typeof createDb>;

let cachedDatabase: Database | undefined;

/**
 * Neon HTTP Drizzle client.
 *
 * Lazy client construction: the Drizzle client and Neon SQL function are
 * initialized on first database property access. No SQL request is sent until
 * a query is executed.
 *
 * Product runtime requires a pooled DATABASE_URL. Migration execution uses the
 * separately guarded direct-connection path.
 */
export const db: Database = new Proxy({} as Database, {
	get(_target, property) {
		cachedDatabase ??= createDb();
		const value = Reflect.get(cachedDatabase, property, cachedDatabase);
		return typeof value === "function" ? value.bind(cachedDatabase) : value;
	},
});

/** Required string-backed PostgreSQL column used for organization ownership. */
export type OrganizationIdColumn = AnyPgColumn<{
	data: string;
	dataType: "string";
	notNull: true;
}>;

/** Drizzle table carrying a required string-backed `organization_id` column. */
export type TenantTable = AnyPgTable & {
	organizationId: OrganizationIdColumn;
};

function requireOrganizationId(organizationId: string, caller: string): string {
	const trimmed = organizationId.trim();
	if (trimmed.length === 0) {
		throw new Error(`${caller} requires non-empty organizationId`);
	}
	return trimmed;
}

/**
 * Builds the mandatory organization predicate for organization-owned SQL.
 *
 * This helper composes into reads, joins, updates, and deletes. It is not a
 * substitute for inspecting the final SQL: every organization-owned table in
 * that statement must have an organization predicate.
 */
export function orgWhere<TOrganizationColumn extends OrganizationIdColumn>(
	organizationColumn: TOrganizationColumn,
	organizationId: string,
) {
	return eq(
		organizationColumn,
		requireOrganizationId(organizationId, "orgWhere"),
	);
}

/**
 * Builds the mandatory tenant boundary for an entity-identity lookup.
 *
 * Keep both predicates in the database query so a missing row and a row owned
 * by another organization are publicly indistinguishable.
 */
export function tenantEntityPredicate<
	TIdColumn extends PgColumn,
	TOrganizationColumn extends OrganizationIdColumn,
>(
	columns: Readonly<{
		id: TIdColumn;
		organizationId: TOrganizationColumn;
	}>,
	input: Readonly<{
		id: TIdColumn["_"]["data"];
		organizationId: string;
	}>,
) {
	return and(
		eq(columns.id, input.id),
		orgWhere(columns.organizationId, input.organizationId),
	);
}

/**
 * Convenience full-table tenant read (ARCH-023 · ARCH-025 · ARCH-028 S2.2).
 *
 * Hard predicate only: `organization_id = $orgId`.
 * This helper does not make arbitrary queries tenant-safe: joins and every
 * organization-owned update/delete still require explicit predicates in the
 * final SQL statement. Prefer `orgWhere` and `tenantEntityPredicate` when
 * composing those statements.
 *
 * `from` cast: Drizzle selection generics reject `AnyPgTable` intersections;
 * runtime table identity is unchanged. Return type is `T["$inferSelect"][]`
 * so callers see the concrete table row shape (S7.4 feature shells).
 */
export async function withOrg<T extends TenantTable>(
	table: T,
	orgId: string,
): Promise<T["$inferSelect"][]> {
	const organizationId = requireOrganizationId(orgId, "withOrg");
	const rows = await db
		.select()
		.from(table as unknown as typeof databaseSchema.platformRoleAssignment)
		.where(orgWhere(table.organizationId, organizationId));
	return rows as T["$inferSelect"][];
}
