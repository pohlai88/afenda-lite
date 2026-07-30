import { describe, expect, it } from "vitest";

import { computeDiff, maskSensitiveData } from "../src/differ";

describe("@afenda/audit differ", () => {
	it("emits field-level changes and ignores noise fields", () => {
		const changes = computeDiff(
			{
				name: "a",
				updatedAt: "t1",
				createdAt: "c1",
				version: 1,
				_count: 2,
			},
			{
				name: "b",
				updatedAt: "t2",
				createdAt: "c2",
				version: 2,
				_count: 3,
			},
		);

		expect(changes).toEqual([{ field: "name", oldValue: "a", newValue: "b" }]);
	});

	it("masks sensitive fields in diffs", () => {
		const changes = computeDiff(
			{ password: "secret-old", token: "t1", name: "x" },
			{ password: "secret-new", token: "t2", name: "y" },
		);

		expect(changes).toEqual([
			{ field: "password", oldValue: "***", newValue: "***" },
			{ field: "token", oldValue: "***", newValue: "***" },
			{ field: "name", oldValue: "x", newValue: "y" },
		]);
	});

	it("masks nested sensitive data in snapshots", () => {
		const masked = maskSensitiveData({
			profile: { apiKey: "k", label: "ok" },
			items: [{ secret: "s", id: 1 }],
		});

		expect(masked).toEqual({
			profile: { apiKey: "***", label: "ok" },
			items: [{ secret: "***", id: 1 }],
		});
	});

	it("matches sensitive keys independently of case and separators", () => {
		const masked = maskSensitiveData({
			password_hash: "hash",
			ClientSecret: { nested: "credential" },
			headers: { AUTHORIZATION: "Bearer credential" },
			items: [{ session_token: 42 }],
		});

		expect(masked).toEqual({
			password_hash: "***",
			ClientSecret: "***",
			headers: { AUTHORIZATION: "***" },
			items: [{ session_token: "***" }],
		});
	});

	it("masks sensitive values nested inside changed fields", () => {
		const changes = computeDiff(
			{ profile: { authorization: "Bearer old", label: "before" } },
			{ profile: { authorization: "Bearer new", label: "after" } },
		);

		expect(changes).toEqual([
			{
				field: "profile",
				oldValue: { authorization: "***", label: "before" },
				newValue: { authorization: "***", label: "after" },
			},
		]);
	});

	it("uses wildcard field when either side is nullish", () => {
		expect(computeDiff(null, { a: 1 })).toEqual([
			{ field: "*", oldValue: null, newValue: { a: 1 } },
		]);
		expect(computeDiff({ a: 1 }, undefined)).toEqual([
			{ field: "*", oldValue: { a: 1 }, newValue: undefined },
		]);
	});

	it("masks sensitive keys inside wildcard CREATE/DELETE snapshots", () => {
		expect(computeDiff(null, { name: "Ada", password: "secret" })).toEqual([
			{
				field: "*",
				oldValue: null,
				newValue: { name: "Ada", password: "***" },
			},
		]);
		expect(computeDiff({ token: "abc", id: 1 }, null)).toEqual([
			{
				field: "*",
				oldValue: { token: "***", id: 1 },
				newValue: null,
			},
		]);
	});
});
