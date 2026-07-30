import nodeAssert from "node:assert/strict";

function getAsymmetricMatcher(
	value: unknown,
): ((actual: unknown) => boolean) | undefined {
	if (typeof value !== "object" || value === null) {
		return;
	}
	const asymmetricMatch = Reflect.get(value, "asymmetricMatch");
	return typeof asymmetricMatch === "function"
		? asymmetricMatch.bind(value)
		: undefined;
}

function projectExpectedShape(actual: unknown, expected: unknown): unknown {
	const asymmetricMatch = getAsymmetricMatcher(expected);
	if (asymmetricMatch !== undefined) {
		nodeAssert.ok(asymmetricMatch(actual));
		return expected;
	}
	if (Array.isArray(expected)) {
		nodeAssert.ok(Array.isArray(actual));
		return expected.map((value, index) =>
			projectExpectedShape(actual[index], value),
		);
	}
	if (
		typeof expected === "object" &&
		expected !== null &&
		typeof actual === "object" &&
		actual !== null
	) {
		return Object.fromEntries(
			Object.entries(expected).map(([key, value]) => [
				key,
				projectExpectedShape(Reflect.get(actual, key), value),
			]),
		);
	}
	return actual;
}

function deepIncludes(actual: unknown, expected: unknown): boolean {
	if (!Array.isArray(actual)) {
		return false;
	}
	return actual.some((value) => {
		try {
			nodeAssert.deepStrictEqual(value, expected);
			return true;
		} catch {
			return false;
		}
	});
}

/** Assertion adapter for reusable test fixtures that execute inside Vitest cases. */
export const helperAssert = {
	deepEqual: nodeAssert.deepStrictEqual,
	doesNotMatch: nodeAssert.doesNotMatch,
	deepInclude(actual: unknown, expected: unknown, message?: string): void {
		if (Array.isArray(actual) && !Array.isArray(expected)) {
			nodeAssert.ok(deepIncludes(actual, expected), message);
			return;
		}
		nodeAssert.deepStrictEqual(
			projectExpectedShape(actual, expected),
			expected,
			message,
		);
	},
	include(
		actual: { includes: (value: unknown) => boolean },
		expected: unknown,
	): void {
		nodeAssert.ok(actual.includes(expected));
	},
	isAbove(actual: number, expected: number, message?: string): void {
		nodeAssert.ok(actual > expected, message);
	},
	isDefined(actual: unknown, message?: string): void {
		nodeAssert.notStrictEqual(actual, undefined, message);
	},
	isNull(actual: unknown, message?: string): void {
		nodeAssert.strictEqual(actual, null, message);
	},
	match: nodeAssert.match,
	notStrictEqual: nodeAssert.notStrictEqual,
	strictEqual: nodeAssert.strictEqual,
} as const;
