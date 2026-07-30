/**
 * Unit tests for Neon transient failure classification + retries (no live API).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isTransientNeonFailure, withNeonRetries } from "./neon-api-retry.mjs";

const BRANCH_NOT_FOUND_PATTERN = /branch not found/;

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
			assert.equal(
				isTransientNeonFailure({ status }),
				true,
				`status ${status}`,
			);
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
			BRANCH_NOT_FOUND_PATTERN,
		);
		assert.equal(calls, 1);
	});

	it("reports retry attempts and exponential delays in order", async () => {
		const retries = [];
		let calls = 0;
		const value = await withNeonRetries(
			() => {
				calls += 1;
				if (calls < 3) {
					throw new Error("fetch failed");
				}
				return "ok";
			},
			{
				attempts: 3,
				baseDelayMs: 1,
				onRetry: ({ attempt, delayMs }) => {
					retries.push({ attempt, delayMs });
				},
			},
		);

		assert.equal(value, "ok");
		assert.deepEqual(retries, [
			{ attempt: 1, delayMs: 1 },
			{ attempt: 2, delayMs: 2 },
		]);
	});

	it("rethrows the original transient error after the final attempt", async () => {
		const terminalError = new Error("service unavailable");
		let calls = 0;

		await assert.rejects(
			() =>
				withNeonRetries(
					() => {
						calls += 1;
						throw terminalError;
					},
					{ attempts: 2, baseDelayMs: 1 },
				),
			(error) => error === terminalError,
		);
		assert.equal(calls, 2);
	});

	it("preserves zero-attempt behavior", async () => {
		let called = false;
		await assert.rejects(
			() =>
				withNeonRetries(
					() => {
						called = true;
					},
					{ attempts: 0 },
				),
			(error) => error === undefined,
		);
		assert.equal(called, false);
	});
});
