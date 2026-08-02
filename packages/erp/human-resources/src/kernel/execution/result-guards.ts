import type { Result, ResultFailure } from "@afenda/errors";

export function isResultFailure<Value>(
	result: Result<Value>,
): result is ResultFailure {
	return result.ok === false;
}
