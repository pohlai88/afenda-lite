// biome-ignore-all lint/suspicious/useAwait: Transaction wrappers expose one asynchronous API for nested and root execution.
import { AsyncLocalStorage } from "node:async_hooks";
import type { NeonHttpSql } from "@afenda/db";
import type { Result } from "@afenda/errors/result";

import type {
	CorporateAdministrationTransactionContext,
	CorporateAdministrationTransactionOutcome,
	CorporateAdministrationTransactionPort,
	CorporateAdministrationTransactionStatement,
} from "../../ports";
import type { CorporateAdministrationNeonTransactionExecutor } from "./dependencies";
import { translateCorporateAdministrationInfrastructureError } from "./errors";

export type CorporateAdministrationDrizzleTransactionDependencies = Readonly<{
	execute: CorporateAdministrationNeonTransactionExecutor;
}>;

export function createDrizzleCorporateAdministrationTransactionPort(
	dependencies: CorporateAdministrationDrizzleTransactionDependencies,
): CorporateAdministrationTransactionPort {
	return new DrizzleCorporateAdministrationTransactionPort(dependencies);
}

export class DrizzleCorporateAdministrationTransactionPort
	implements CorporateAdministrationTransactionPort
{
	readonly nesting = "prohibited" as const;

	readonly #execute: CorporateAdministrationNeonTransactionExecutor;
	readonly #scope = new AsyncLocalStorage<boolean>();

	constructor(
		dependencies: CorporateAdministrationDrizzleTransactionDependencies,
	) {
		this.#execute = dependencies.execute;
	}

	async run<TResult>(
		work: (
			context: CorporateAdministrationTransactionContext,
		) => Promise<CorporateAdministrationTransactionOutcome<TResult>>,
	): Promise<Result<TResult>> {
		if (this.#scope.getStore() === true) {
			throw new RangeError(
				"Nested Corporate Administration transactions are prohibited",
			);
		}

		return this.#scope.run(true, async () => {
			let closed = false;
			try {
				const statements: CorporateAdministrationTransactionStatement[] = [];
				const context = Object.freeze({
					enqueue(statement: CorporateAdministrationTransactionStatement) {
						if (closed) {
							throw new RangeError(
								"Corporate Administration transaction context is closed",
							);
						}
						statements.push(statement);
					},
					get statementCount() {
						return statements.length;
					},
				}) satisfies CorporateAdministrationTransactionContext;

				const outcome = await work(context);
				if (outcome.effect !== "commit" && outcome.effect !== "rollback") {
					throw new TypeError(
						"Corporate Administration transaction outcome is invalid",
					);
				}
				if (outcome.effect === "rollback") {
					return outcome.result;
				}

				if (statements.length === 0) {
					return outcome.result;
				}

				try {
					await this.#execute((sql) => {
						const queries = statements.map((statement) =>
							statement(sql as NeonHttpSql),
						);
						return queries as ReturnType<NeonHttpSql>[];
					});
				} catch (error) {
					const translated =
						translateCorporateAdministrationInfrastructureError(error);
					if (translated !== undefined) {
						return translated;
					}
					throw error;
				}

				return outcome.result;
			} finally {
				closed = true;
			}
		});
	}
}
