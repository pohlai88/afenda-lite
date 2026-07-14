import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import type { AnyPgTable, PgColumn } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/neon-http";
import { requireDatabaseUrl } from "./env";
import * as schema from "./schema";

export type DbSchema = typeof schema;

function createDb() {
  return drizzle(neon(requireDatabaseUrl()), { schema });
}

export type Database = ReturnType<typeof createDb>;

let cached: Database | undefined;

/**
 * Neon HTTP Drizzle client (ARCH-025).
 * Lazy: no connection until first property access.
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
 * runtime table identity is unchanged.
 */
export function withOrg(table: TenantTable, orgId: string) {
  return db
    .select()
    .from(table as typeof schema.surveys)
    .where(eq(table.organizationId, orgId));
}
