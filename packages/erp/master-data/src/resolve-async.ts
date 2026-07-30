/**
 * Preserve a Promise-based port boundary for synchronous adapter logic.
 * The operation runs immediately, matching an async function before its first
 * await, while synchronous failures remain observable as Promise rejections.
 */
export function resolveAsync<T>(
	operation: () => T | PromiseLike<T>,
): Promise<T> {
	try {
		return Promise.resolve(operation());
	} catch (error) {
		return Promise.reject(error);
	}
}

/** Execute ordered asynchronous work without overlapping operations. */
export function runSequentially<T>(
	values: readonly T[],
	operation: (value: T, index: number) => PromiseLike<unknown> | unknown,
): Promise<void> {
	return values.reduce<Promise<void>>(
		(pending, value, index) =>
			pending.then(() => operation(value, index)).then(() => undefined),
		Promise.resolve(),
	);
}

/**
 * Execute ordered work until an operation returns a terminal value.
 * An undefined result means continue; every other value stops subsequent work.
 */
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
