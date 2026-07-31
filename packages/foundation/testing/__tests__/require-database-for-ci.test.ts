/**
 * @afenda/testing
 * Contract: TESTING-CONTROL-PLANE
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { describe, expect, it } from "vitest";
import {
	type ResolveDatabaseUrlOptions,
	testingDatabase,
} from "../src/index.js";

type VirtualFiles = Readonly<Record<string, string>>;

function normalizeVirtualPath(target: unknown): string {
	return String(target)
		.replace(/^[A-Z]:/i, "")
		.replaceAll("\\", "/");
}

function createOptions(
	environment: NodeJS.ProcessEnv,
	files: VirtualFiles = {},
): ResolveDatabaseUrlOptions {
	return {
		environment,
		repositoryRoot: "/repo",
		fileSystem: {
			exists: (target) => Object.hasOwn(files, normalizeVirtualPath(target)),
			readText: (target) => {
				const filePath = normalizeVirtualPath(target);
				const content = files[filePath];

				if (content === undefined) {
					throw new Error(`Unexpected read: ${filePath}`);
				}

				return content;
			},
		},
	};
}

describe("resolveDatabaseUrlForTests", () => {
	it("uses an injected DATABASE_URL", () => {
		const environment: NodeJS.ProcessEnv = {
			DATABASE_URL: "postgresql://user:pass@example.test/app",
		};

		const result = testingDatabase.resolve(createOptions(environment));

		expect(result).toEqual({
			databaseUrl: "postgresql://user:pass@example.test/app",
			hasDatabase: true,
			source: "environment",
		});
	});

	it("trims surrounding DATABASE_URL whitespace", () => {
		const environment: NodeJS.ProcessEnv = {
			DATABASE_URL: "  postgresql://user:pass@example.test/app  ",
		};

		const result = testingDatabase.resolve(createOptions(environment));

		expect(result.databaseUrl).toBe("postgresql://user:pass@example.test/app");
		expect(environment.DATABASE_URL).toBe(
			"postgresql://user:pass@example.test/app",
		);
	});

	it("treats a blank DATABASE_URL as missing locally", () => {
		const environment: NodeJS.ProcessEnv = {
			DATABASE_URL: "   ",
		};

		const result = testingDatabase.resolve(createOptions(environment));

		expect(result).toEqual({
			databaseUrl: undefined,
			hasDatabase: false,
			source: "missing",
		});
	});

	it("loads DATABASE_URL from local .env.local", () => {
		const environment: NodeJS.ProcessEnv = {};

		const result = testingDatabase.resolve(
			createOptions(environment, {
				"/repo/.env.local": 'DATABASE_URL="postgresql://local/app"\n',
			}),
		);

		expect(result).toEqual({
			databaseUrl: "postgresql://local/app",
			hasDatabase: true,
			source: "env-local",
		});
		expect(environment.DATABASE_URL).toBe("postgresql://local/app");
	});

	it("prefers the injected environment over .env.local", () => {
		const environment: NodeJS.ProcessEnv = {
			DATABASE_URL: "postgresql://injected/app",
		};

		const result = testingDatabase.resolve(
			createOptions(environment, {
				"/repo/.env.local": "DATABASE_URL=postgresql://local/app",
			}),
		);

		expect(result.databaseUrl).toBe("postgresql://injected/app");
		expect(result.source).toBe("environment");
	});

	it.each([
		"1",
		"true",
		"TRUE",
		"True",
	])("fails closed when CI=%s and DATABASE_URL is missing", (ciValue) => {
		const environment: NodeJS.ProcessEnv = {
			CI: ciValue,
		};

		expect(() =>
			testingDatabase.resolve(
				createOptions(environment, {
					"/repo/.env.local": "DATABASE_URL=postgresql://local/app",
				}),
			),
		).toThrow("GUIDE-018 I5.5 database test gate blocked");
	});

	it("ignores .env.local under CI", () => {
		const environment: NodeJS.ProcessEnv = {
			CI: "true",
		};

		expect(() =>
			testingDatabase.resolve(
				createOptions(environment, {
					"/repo/.env.local": "DATABASE_URL=postgresql://local/app",
				}),
			),
		).toThrow("GUIDE-018 I5.5 database test gate blocked");
	});

	it.each([
		"1",
		"true",
		"TRUE",
		"True",
	])("fails closed when REQUIRE_DATABASE_TESTS=%s", (requireValue) => {
		const environment: NodeJS.ProcessEnv = {
			REQUIRE_DATABASE_TESTS: requireValue,
		};

		expect(() => testingDatabase.resolve(createOptions(environment))).toThrow(
			"GUIDE-018 I5.5 database test gate blocked",
		);
	});

	it("allows local execution without a database", () => {
		const result = testingDatabase.resolve(createOptions({}));

		expect(result).toEqual({
			databaseUrl: undefined,
			hasDatabase: false,
			source: "missing",
		});
	});

	it("unwraps single-quoted values", () => {
		const result = testingDatabase.resolve(
			createOptions(
				{},
				{
					"/repo/.env.local": "DATABASE_URL='postgresql://local/app'",
				},
			),
		);

		expect(result.databaseUrl).toBe("postgresql://local/app");
	});

	it("ignores comments and unrelated values", () => {
		const result = testingDatabase.resolve(
			createOptions(
				{},
				{
					"/repo/.env.local": [
						"# Local development",
						"OTHER_VALUE=ignored",
						"",
						"DATABASE_URL=postgresql://local/app",
					].join("\n"),
				},
			),
		);

		expect(result.databaseUrl).toBe("postgresql://local/app");
	});

	it("surfaces unexpected filesystem read failures", () => {
		const environment: NodeJS.ProcessEnv = {};

		expect(() =>
			testingDatabase.resolve({
				environment,
				repositoryRoot: "/repo",
				fileSystem: {
					exists: () => true,
					readText: () => {
						throw new Error("Permission denied");
					},
				},
			}),
		).toThrow("Permission denied");
	});

	it("discovers the repository root by marker", () => {
		const result = testingDatabase.resolve({
			environment: {},
			startDirectory: "/repo/packages/foundation/testing/dist",
			fileSystem: {
				exists: (target) =>
					normalizeVirtualPath(target) === "/repo/pnpm-workspace.yaml" ||
					normalizeVirtualPath(target) === "/repo/.env.local",
				readText: () => "DATABASE_URL=postgresql://discovered/app",
			},
		});

		expect(result).toEqual({
			databaseUrl: "postgresql://discovered/app",
			hasDatabase: true,
			source: "env-local",
		});
	});

	it("fails when automatic repository-root discovery cannot find a marker", () => {
		expect(() =>
			testingDatabase.resolve({
				environment: {},
				startDirectory: "/not-a-repo",
				fileSystem: {
					exists: () => false,
					readText: () => "",
				},
			}),
		).toThrow("@afenda/testing could not locate the workspace root");
	});
});

describe("E2E database helpers", () => {
	it("requires DATABASE_URL through the canonical resolver", () => {
		const originalDatabaseUrl = process.env.DATABASE_URL;
		const originalRequireDatabaseTests = process.env.REQUIRE_DATABASE_TESTS;

		try {
			process.env.DATABASE_URL = "postgresql://e2e/app";
			delete process.env.REQUIRE_DATABASE_TESTS;

			expect(testingDatabase.requireE2eUrl()).toBe("postgresql://e2e/app");
			expect(testingDatabase.hasE2eUrl()).toBe(true);
		} finally {
			if (originalDatabaseUrl === undefined) {
				delete process.env.DATABASE_URL;
			} else {
				process.env.DATABASE_URL = originalDatabaseUrl;
			}

			if (originalRequireDatabaseTests === undefined) {
				delete process.env.REQUIRE_DATABASE_TESTS;
			} else {
				process.env.REQUIRE_DATABASE_TESTS = originalRequireDatabaseTests;
			}
		}
	});
});
