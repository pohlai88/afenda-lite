import type { CorporateAdministrationTransactionPort } from "@afenda/corporate-administration";
import type { Result } from "@afenda/errors";

/**
 * Single-process unit-test double that invokes `work` directly.
 *
 * It provides no rollback simulation, isolation, concurrency behavior, or
 * savepoints. It is not production-safe. The running flag enforces the port's
 * nesting prohibition only; it does not model a database transaction.
 */
export function createInlineCorporateAdministrationTransactionPort(): CorporateAdministrationTransactionPort {
	let running = false;

	return Object.freeze({
		nesting: "prohibited",
		async run<TResult>(
			work: Parameters<CorporateAdministrationTransactionPort["run"]>[0],
		): Promise<Result<TResult>> {
			if (running) {
				throw new Error(
					"Nested Corporate Administration transactions are prohibited",
				);
			}

			running = true;
			let closed = false;
			try {
				const statements: unknown[] = [];
				const outcome = await work(
					Object.freeze({
						enqueue(statement) {
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
					}),
				);
				if (outcome.effect !== "commit" && outcome.effect !== "rollback") {
					throw new TypeError(
						"Corporate Administration transaction outcome is invalid",
					);
				}
				return outcome.result as Result<TResult>;
			} finally {
				closed = true;
				running = false;
			}
		},
	});
}
