/**
 * Compile-time guard: every HumanResourcesStore method has a Drizzle owner.
 */
import { describe, expect, it } from "vitest";

import type { MissingDrizzleHumanResourcesMethods } from "../src/adapters/drizzle/coverage";

type AssertNever<T extends never> = T;

type _DrizzleStoreComplete = AssertNever<MissingDrizzleHumanResourcesMethods>;

describe("drizzle coverage inventory", () => {
	it("covers every HumanResourcesStore method", () => {
		const _complete: _DrizzleStoreComplete = undefined as never;
		expect(_complete).toBeUndefined();
	});
});
