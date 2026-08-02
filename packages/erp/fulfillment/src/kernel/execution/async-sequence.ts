/** Execute ordered work until an operation returns a terminal value. */
export function runSequentiallyUntil<T, TResult>(
	values: readonly T[],
	operation: (
		value: T,
		index: number,
	) => PromiseLike<TResult | undefined> | TResult | undefined,
): Promise<TResult | undefined> {
	return values.reduce<Promise<TResult | undefined>>(
		(pending, value, index) =>
			pending.then((terminal) =>
				terminal === undefined ? operation(value, index) : terminal,
			),
		Promise.resolve(undefined),
	);
}
