/**
 * Neon HTTP non-interactive transactions (ARCH-025 · N12).
 *
 * Product client stays on `drizzle-orm/neon-http` over `-pooler`. Interactive
 * `db.transaction` is unsupported on neon-http; use `sql.transaction([...])`
 * for atomic multi-statement writes in one HTTP round-trip.
 */

import type {
	HTTPTransactionOptions,
	NeonQueryFunction,
	NeonQueryPromise,
} from "@neondatabase/serverless";
import { neon } from "@neondatabase/serverless";

import { requireProductDatabaseUrl } from "./env";

export type NeonHttpIsolationLevel = NonNullable<
	HTTPTransactionOptions<false, false>["isolationLevel"]
>;

export interface NeonHttpTransactionOptions {
	readonly deferrable?: boolean;
	readonly isolationLevel?: NeonHttpIsolationLevel;
	readonly readOnly?: boolean;
}

export type NeonHttpSql = NeonQueryFunction<false, false>;

let cachedSql: NeonHttpSql | undefined;

/**
 * Shared Neon HTTP SQL client (same instance as the Drizzle product client).
 * Lazy: no connection until first call.
 */
export function getNeonSql(): NeonHttpSql {
	cachedSql ??= neon(requireProductDatabaseUrl());
	return cachedSql;
}

type NeonHttpTxQuery = NeonQueryPromise<false, false>;
type NeonHttpTxQueries = readonly NeonHttpTxQuery[];

function normalizeTransactionOptions(
	options: NeonHttpTransactionOptions | undefined,
): HTTPTransactionOptions<false, false> {
	const isolationLevel = options?.isolationLevel ?? "ReadCommitted";

	if (
		options?.deferrable === true &&
		(options.readOnly !== true || isolationLevel !== "Serializable")
	) {
		throw new Error(
			"runNeonHttpTransaction: deferrable requires readOnly=true and isolationLevel=Serializable",
		);
	}

	return {
		isolationLevel,
		...(options?.readOnly === undefined ? {} : { readOnly: options.readOnly }),
		...(options?.deferrable === undefined
			? {}
			: { deferrable: options.deferrable }),
	};
}

/**
 * Run a predeclared query batch in one Neon HTTP non-interactive Postgres
 * transaction. The builder callback is synchronous and only constructs the
 * batch; it cannot await a result or branch between statements.
 *
 * Statements execute in array order and commit together or roll back together.
 * Later SQL statements observe earlier writes according to the selected
 * isolation level, but application code cannot inspect intermediate results.
 * This helper performs no automatic retries.
 *
 * Default isolation: `ReadCommitted` (Postgres write default; explicit for ops).
 */
export async function runNeonHttpTransaction<T extends unknown[]>(
	queriesOrFn: NeonHttpTxQueries | ((sql: NeonHttpSql) => NeonHttpTxQueries),
	options?: NeonHttpTransactionOptions,
): Promise<T> {
	if (Array.isArray(queriesOrFn) && queriesOrFn.length === 0) {
		throw new Error("runNeonHttpTransaction requires at least one query");
	}

	const transactionOptions = normalizeTransactionOptions(options);
	const sql = getNeonSql();
	const queries =
		typeof queriesOrFn === "function" ? queriesOrFn(sql) : queriesOrFn;
	if (queries.length === 0) {
		throw new Error("runNeonHttpTransaction requires at least one query");
	}

	const result = await sql.transaction([...queries], transactionOptions);
	return result as T;
}
