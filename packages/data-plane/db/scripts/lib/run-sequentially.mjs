/**
 * Runs asynchronous operations one at a time in input order.
 * Rejections stop the chain before later operations begin.
 *
 * @template T
 * @param {readonly T[]} values
 * @param {(value: T, index: number) => PromiseLike<unknown> | unknown} operation
 * @returns {Promise<void>}
 */
export function runSequentially(values, operation) {
	return values.reduce(
		(previous, value, index) =>
			previous.then(() => operation(value, index)).then(() => undefined),
		Promise.resolve(),
	);
}
