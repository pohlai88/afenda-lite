/**
 * Compile-time guard: every HumanResourcesStore method has a memory owner.
 */
import { describe, expect, it } from "vitest";

import type { MissingMemoryHumanResourcesMethods } from "../src/adapters/memory/coverage";

type AssertNever<T extends never> = T;

type _MemoryStoreComplete = AssertNever<MissingMemoryHumanResourcesMethods>;

describe("memory coverage inventory", () => {
	it("covers every HumanResourcesStore method", () => {
		const _complete: _MemoryStoreComplete = undefined as never;
		expect(_complete).toBeUndefined();
	});
});
