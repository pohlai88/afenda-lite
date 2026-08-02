/**
 * Neon HTTP non-interactive transactions (ARCH-025 · N12).
 *
 * Product client stays on `drizzle-orm/neon-http` over `-pooler`. Interactive
 * `db.transaction` is unsupported on neon-http; use the governed builder below
 * for atomic multi-statement writes in one HTTP round-trip.
 */

import type {
	HTTPTransactionOptions,
	NeonQueryFunction,
	NeonQueryPromise,
} from "@neondatabase/serverless";
import { neon } from "@neondatabase/serverless";

import { requireProductDatabaseUrl } from "./env";
import {
	assertSystemSqlSafety,
	type SystemSqlOperation,
} from "./system-sql-policy";
import { assertTenantSqlSafety } from "./tenant-sql-policy";

export type NeonHttpIsolationLevel = NonNullable<
	HTTPTransactionOptions<false, false>["isolationLevel"]
>;

export interface NeonHttpTransactionOptions {
	readonly deferrable?: boolean;
	readonly isolationLevel?: NeonHttpIsolationLevel;
	readonly readOnly?: boolean;
}

type NeonDriverSql = NeonQueryFunction<false, false>;

/** Tenant-governed query surface. Raw SQL and nested transactions are absent. */
export interface NeonHttpSql {
	readonly query: NeonDriverSql["query"];
	(
		strings: TemplateStringsArray,
		...params: unknown[]
	): NeonQueryPromise<false, false>;
}

let cachedDriverSql: NeonDriverSql | undefined;
let cachedTenantSql: NeonDriverSql | undefined;

function createGovernedSql(
	sql: NeonDriverSql,
	assertStatement: (statement: string) => void,
	label: string,
): NeonDriverSql {
	return new Proxy(sql, {
		apply(target, thisArgument, argumentsList) {
			const [templateParts] = argumentsList;
			if (
				Array.isArray(templateParts) &&
				templateParts.every((part) => typeof part === "string")
			) {
				assertStatement(templateParts.join(" ? "));
			}
			return Reflect.apply(target, thisArgument, argumentsList);
		},
		get(target, property, receiver) {
			if (property === "unsafe") {
				return () => {
					throw new Error(
						`${label} Neon SQL: sql.unsafe is not permitted`,
					);
				};
			}
			const value = Reflect.get(target, property, receiver);
			if (property === "query" && typeof value === "function") {
				return (
					queryWithPlaceholders: string,
					...queryArguments: unknown[]
				) => {
					assertStatement(queryWithPlaceholders);
					return Reflect.apply(value, target, [
						queryWithPlaceholders,
						...queryArguments,
					]);
				};
			}
			return typeof value === "function" ? value.bind(target) : value;
		},
	});
}

/**
 * Shared Neon HTTP SQL client (same instance as the Drizzle product client).
 * Lazy: no connection until first call.
 */
export function getNeonSql(): NeonHttpSql {
	return getNeonDriverSql();
}

/** Internal full driver surface for Drizzle and the transaction submitter. */
export function getNeonDriverSql(): NeonDriverSql {
	cachedDriverSql ??= neon(requireProductDatabaseUrl());
	cachedTenantSql ??= createGovernedSql(
		cachedDriverSql,
		assertTenantSqlSafety,
		"Tenant-governed",
	);
	return cachedTenantSql;
}

export type NeonHttpTransactionQuery = ReturnType<NeonHttpSql>;
export type NeonHttpTransactionQueries = readonly NeonHttpTransactionQuery[];
export type NeonHttpTransactionBuilder<
	TQueries extends NeonHttpTransactionQueries,
> = (sql: NeonHttpSql) => TQueries;

/**
 * Driver-inferred transaction results. Tuple builders preserve exact bounds;
 * dynamic arrays retain honest possibly-absent indexing under strict TS flags.
 */
export type NeonHttpTransactionResults<
	TQueries extends NeonHttpTransactionQueries = NeonHttpTransactionQueries,
> = { readonly [Index in keyof TQueries]: Awaited<TQueries[Index]> };

function assertTransactionResults<TQueries extends NeonHttpTransactionQueries>(
	value: unknown,
	queries: TQueries,
): asserts value is NeonHttpTransactionResults<TQueries> {
	if (
		!Array.isArray(value) ||
		value.length !== queries.length ||
		value.some((statementResult) => !Array.isArray(statementResult))
	) {
		throw new Error(
			"runNeonHttpTransaction received an invalid result batch from Neon",
		);
	}
}

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
export async function runNeonHttpTransaction<
	const TQueries extends NeonHttpTransactionQueries,
>(
	buildQueries: NeonHttpTransactionBuilder<TQueries>,
	options?: NeonHttpTransactionOptions,
): Promise<NeonHttpTransactionResults<TQueries>> {
	if (typeof buildQueries !== "function") {
		throw new TypeError(
			"runNeonHttpTransaction requires a synchronous query builder",
		);
	}

	const transactionOptions = normalizeTransactionOptions(options);
	const sql = getNeonDriverSql();
	const queries = buildQueries(sql);
	if (!Array.isArray(queries)) {
		throw new TypeError(
			"runNeonHttpTransaction builder must synchronously return a query array",
		);
	}
	if (queries.length === 0) {
		throw new Error("runNeonHttpTransaction requires at least one query");
	}

	const results: unknown = await sql.transaction(
		[...queries],
		transactionOptions,
	);
	assertTransactionResults(results, queries);
	return results;
}

/**
 * Run one closed-registry cross-organization infrastructure operation.
 * Product code must use the tenant-governed transaction capability instead.
 */
export async function runNeonHttpSystemTransaction<
	const TQueries extends NeonHttpTransactionQueries,
>(
	operation: SystemSqlOperation,
	buildQueries: NeonHttpTransactionBuilder<TQueries>,
	options?: NeonHttpTransactionOptions,
): Promise<NeonHttpTransactionResults<TQueries>> {
	if (typeof buildQueries !== "function") {
		throw new TypeError(
			"runNeonHttpSystemTransaction requires a synchronous query builder",
		);
	}
	cachedDriverSql ??= neon(requireProductDatabaseUrl());
	const sql = createGovernedSql(
		cachedDriverSql,
		(statement) => assertSystemSqlSafety(operation, statement),
		"System-governed",
	);
	const queries = buildQueries(sql);
	if (!Array.isArray(queries) || queries.length !== 1) {
		throw new Error(
			"runNeonHttpSystemTransaction requires exactly one registered statement",
		);
	}
	const results: unknown = await sql.transaction(
		[...queries],
		normalizeTransactionOptions(options),
	);
	assertTransactionResults(results, queries);
	return results;
}
