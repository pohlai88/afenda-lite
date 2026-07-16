import { afterEach, describe, expect, it } from "vitest";

import {
	requireDatabaseUrl,
	requireMigrationDatabaseUrl,
	requireProductDatabaseUrl,
} from "../src/env";

const original = process.env.DATABASE_URL;

afterEach(() => {
	if (original === undefined) {
		delete process.env.DATABASE_URL;
	} else {
		process.env.DATABASE_URL = original;
	}
});

describe("@afenda/db requireProductDatabaseUrl", () => {
	it("requires DATABASE_URL", () => {
		delete process.env.DATABASE_URL;
		expect(() => requireProductDatabaseUrl()).toThrow(
			/DATABASE_URL is required/,
		);
	});

	it("requires Neon -pooler host for the product client", () => {
		process.env.DATABASE_URL =
			"postgresql://u:p@ep-example.c-2.ap-southeast-1.aws.neon.tech/neondb";
		expect(() => requireProductDatabaseUrl()).toThrow(/-pooler/);
	});

	it("rejects non-postgres protocols", () => {
		process.env.DATABASE_URL = "https://example.com/db";
		expect(() => requireProductDatabaseUrl()).toThrow(/postgres URL/);
	});

	it("returns a pooler URL", () => {
		const url =
			"postgresql://u:p@ep-example-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
		process.env.DATABASE_URL = url;
		expect(requireProductDatabaseUrl()).toBe(url);
	});
});

describe("@afenda/db requireMigrationDatabaseUrl", () => {
	it("requires DATABASE_URL", () => {
		delete process.env.DATABASE_URL;
		expect(() => requireMigrationDatabaseUrl()).toThrow(
			/DATABASE_URL is required/,
		);
	});

	it("rejects invalid URLs", () => {
		process.env.DATABASE_URL = "not-a-url";
		expect(() => requireMigrationDatabaseUrl()).toThrow(/valid URL/);
	});

	it("rejects non-postgres protocols", () => {
		process.env.DATABASE_URL = "https://example.com/db";
		expect(() => requireMigrationDatabaseUrl()).toThrow(/postgres URL/);
	});

	it("accepts a valid non-pooler postgres URL", () => {
		const url =
			"postgresql://u:p@ep-example.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
		process.env.DATABASE_URL = url;
		expect(requireMigrationDatabaseUrl()).toBe(url);
	});

	it("accepts a pooler URL (same key)", () => {
		const url =
			"postgresql://u:p@ep-example-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
		process.env.DATABASE_URL = url;
		expect(requireMigrationDatabaseUrl()).toBe(url);
	});
});

describe("@afenda/db requireDatabaseUrl alias", () => {
	it("matches product resolver (rejects non-pooler)", () => {
		process.env.DATABASE_URL =
			"postgresql://u:p@ep-example.c-2.ap-southeast-1.aws.neon.tech/neondb";
		expect(() => requireDatabaseUrl()).toThrow(/-pooler/);
	});
});
