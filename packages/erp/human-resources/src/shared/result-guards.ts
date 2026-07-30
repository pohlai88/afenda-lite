import type { Result, ResultFailure } from "@afenda/errors/result";

export function isResultFailure<Value>(
	result: Result<Value>,
): result is ResultFailure {
	return result.ok === false;
}
