/**
 * Unit tests for Neon transient failure classification + retries (no live API).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	isTransientNeonFailure,
	withNeonRetries,
} from "./neon-api-retry.mjs";

describe("isTransientNeonFailure", () => {
	it("flags Neon CLI reachability blip", () => {
		assert.equal(
			isTransientNeonFailure({
				message:
					"ERROR: Could not reach the Neon API. Please check your internet connection and try again.",
			}),
			true,
		);
	});

	it("flags common HTTP statuses", () => {
		for (const status of [408, 429, 500, 502, 503, 504]) {
			assert.equal(isTransientNeonFailure({ status }), true, `status ${status}`);
		}
	});

	it("does not flag auth or not-found as transient", () => {
		assert.equal(isTransientNeonFailure({ status: 401 }), false);
		assert.equal(isTransientNeonFailure({ status: 404 }), false);
		assert.equal(
			isTransientNeonFailure({ message: "branch not found" }),
			false,
		);
	});
});

describe("withNeonRetries", () => {
	it("retries transient failures then succeeds", async () => {
		let calls = 0;
		const value = await withNeonRetries(
			() => {
				calls += 1;
				if (calls < 3) {
					const err = new Error("Could not reach the Neon API");
					throw err;
				}
				return "ok";
			},
			{ attempts: 4, baseDelayMs: 1 },
		);
		assert.equal(value, "ok");
		assert.equal(calls, 3);
	});

	it("does not retry non-transient failures", async () => {
		let calls = 0;
		await assert.rejects(
			() =>
				withNeonRetries(
					() => {
						calls += 1;
						throw new Error("branch not found");
					},
					{ attempts: 4, baseDelayMs: 1 },
				),
			/branch not found/,
		);
		assert.equal(calls, 1);
	});
});
