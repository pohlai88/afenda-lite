import { afterEach, describe, expect, it } from "vitest";

import {
	requireDatabaseUrl,
	requireDirectMigrationDatabaseUrl,
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
		expect(() => requireProductDatabaseUrl()).toThrow(/postgres or postgresql/);
	});

	it("rejects an unrelated -pooler occurrence outside the first host label", () => {
		process.env.DATABASE_URL =
			"postgresql://u:p@proxy.example-pooler-domain.com/neondb";
		expect(() => requireProductDatabaseUrl()).toThrow(/-pooler/);
	});

	it("returns a pooler URL", () => {
		const url =
			"postgresql://u:p@ep-example-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
		process.env.DATABASE_URL = url;
		expect(requireProductDatabaseUrl()).toBe(url);
	});

	it("trims the returned URL", () => {
		const url =
			"postgresql://u:p@ep-example-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb";
		process.env.DATABASE_URL = `  ${url}  `;
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
		expect(() => requireMigrationDatabaseUrl()).toThrow(
			/postgres or postgresql/,
		);
	});

	it("rejects a PostgreSQL URL without a hostname", () => {
		process.env.DATABASE_URL = "postgresql:///neondb";
		expect(() => requireMigrationDatabaseUrl()).toThrow(/hostname/);
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

describe("@afenda/db requireDirectMigrationDatabaseUrl", () => {
	it("accepts a direct PostgreSQL endpoint", () => {
		const url =
			"postgres://u:p@ep-example.c-2.ap-southeast-1.aws.neon.tech/neondb";
		process.env.DATABASE_URL = url;
		expect(requireDirectMigrationDatabaseUrl()).toBe(url);
	});

	it("rejects a pooled Neon endpoint without exposing credentials", () => {
		const url =
			"postgresql://sensitive-user:sensitive-password@ep-example-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb";
		process.env.DATABASE_URL = url;

		let message = "";
		try {
			requireDirectMigrationDatabaseUrl();
		} catch (error) {
			message = error instanceof Error ? error.message : String(error);
		}

		expect(message).toMatch(/direct DATABASE_URL/);
		expect(message).not.toContain("sensitive-user");
		expect(message).not.toContain("sensitive-password");
	});
});

describe("@afenda/db requireDatabaseUrl alias", () => {
	it("matches product resolver (rejects non-pooler)", () => {
		process.env.DATABASE_URL =
			"postgresql://u:p@ep-example.c-2.ap-southeast-1.aws.neon.tech/neondb";
		expect(() => requireDatabaseUrl()).toThrow(/-pooler/);
	});
});
