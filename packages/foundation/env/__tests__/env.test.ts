/**
 * @afenda/env
 * Contract: ENV-TESTS
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
	APPROVED_NEON_BRANCH_ID,
	APPROVED_NEON_ORG_ID,
	APPROVED_NEON_PROJECT_ID,
	assertAppUrl,
	assertCookieSecret,
	assertLocalOnlyConfigAbsentInProduction,
	assertLocalOnlySecretsAbsentInProduction,
	assertNeonAuthBaseUrl,
	assertNeonCloudIds,
	assertPairedSecretConfig,
	assertPlaygroundLocalOnly,
	assertProductDatabaseUrl,
	evaluateNeonProductEnv,
	evaluateProdBranchBaselineMigratePosture,
	isApprovedAppHost,
	isNeonPoolerDatabaseUrl,
	isProductionDeployment,
	NEON_ENV_CLASSIFICATION,
	PRODUCTION_BASELINE_MIGRATE_PROHIBITED,
	redactEnvValue,
} from "../src/neon-contract";

const POOLER_URL =
	"postgresql://neondb_owner:secret@ep-example-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const DIRECT_URL =
	"postgresql://neondb_owner:secret@ep-example.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const AUTH_BASE =
	"https://ep-example.neonauth.c-2.ap-southeast-1.aws.neon.tech/neondb/auth";
const COOKIE_OK = "x".repeat(32);
const GITHUB_PRIVATE_KEY =
	"-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----";
const GITHUB_PRIVATE_KEY_NORMALIZED =
	"-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----";
const ORIGINAL_PROCESS_ENV = { ...process.env };
const ORIGINAL_DOCS_ENV = {
	DOCS_URL: process.env.DOCS_URL,
	GITHUB_APP_ID: process.env.GITHUB_APP_ID,
	GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY,
	NODE_ENV: process.env.NODE_ENV,
	VERCEL_ENV: process.env.VERCEL_ENV,
};
const REPO_ROOT = join(import.meta.dirname, "../../..", "..");

function restoreProcessEnv() {
	for (const key of Object.keys(process.env)) {
		if (!(key in ORIGINAL_PROCESS_ENV)) {
			delete process.env[key];
		}
	}
	Object.assign(process.env, ORIGINAL_PROCESS_ENV);
}

function restoreDocsProcessEnv() {
	for (const [key, value] of Object.entries(ORIGINAL_DOCS_ENV)) {
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
}

async function importFreshDocsEnv() {
	vi.resetModules();
	return import("../src/docs");
}

async function importFreshWebEnv() {
	vi.resetModules();
	return import("../src/web");
}

function setValidProductionWebEnv(
	overrides: Record<string, string | undefined> = {},
) {
	const values: Record<string, string | undefined> = {
		NODE_ENV: "production",
		VERCEL_ENV: "production",
		SKIP_ENV_VALIDATION: undefined,
		DATABASE_URL: POOLER_URL,
		NEON_AUTH_BASE_URL: AUTH_BASE,
		NEON_AUTH_COOKIE_SECRET: COOKIE_OK,
		APP_URL: "https://www.nexuscanon.com",
		NEON_ORG_ID: APPROVED_NEON_ORG_ID,
		NEON_PROJECT_ID: APPROVED_NEON_PROJECT_ID,
		NEON_BRANCH_ID: APPROVED_NEON_BRANCH_ID,
		UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
		UPSTASH_REDIS_REST_TOKEN: "token",
		HR_RELIABILITY_ENABLED: "false",
		...overrides,
	};
	for (const [key, value] of Object.entries(values)) {
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
}

describe("@afenda/env neon-contract", () => {
	it("detects pooler vs direct DATABASE_URL hosts", () => {
		expect(isNeonPoolerDatabaseUrl(POOLER_URL)).toBe(true);
		expect(
			isNeonPoolerDatabaseUrl("postgresql://user:pass@example-pooler/neondb"),
		).toBe(true);
		expect(isNeonPoolerDatabaseUrl(DIRECT_URL)).toBe(false);
		expect(isNeonPoolerDatabaseUrl("https://example-pooler.test")).toBe(false);
		expect(assertProductDatabaseUrl(POOLER_URL).ok).toBe(true);
		expect(
			assertProductDatabaseUrl("postgresql://user:pass@example-pooler/neondb")
				.ok,
		).toBe(true);
		expect(assertProductDatabaseUrl(DIRECT_URL).ok).toBe(false);
		expect(assertProductDatabaseUrl("https://example-pooler.test").ok).toBe(
			false,
		);
		expect(assertProductDatabaseUrl("not-a-url").ok).toBe(false);
		expect(assertProductDatabaseUrl(DIRECT_URL).issues[0]?.variable).toBe(
			"DATABASE_URL",
		);
	});

	it("requires https Neon Auth base URL", () => {
		expect(assertNeonAuthBaseUrl(AUTH_BASE).ok).toBe(true);
		expect(assertNeonAuthBaseUrl("http://insecure.example/auth").ok).toBe(
			false,
		);
	});

	it("enforces cookie secret length without echoing the value", () => {
		expect(assertCookieSecret(COOKIE_OK).ok).toBe(true);
		const short = assertCookieSecret("too-short");
		expect(short.ok).toBe(false);
		expect(assertCookieSecret(` ${COOKIE_OK}`).ok).toBe(false);
		expect(JSON.stringify(short)).not.toContain("too-short");
		expect(redactEnvValue("super-secret")).toBe("[redacted]");
	});

	it("allows approved APP_URL hosts and rejects unapproved or malformed URLs", () => {
		expect(isApprovedAppHost("localhost")).toBe(true);
		expect(isApprovedAppHost("[::1]")).toBe(true);
		expect(isApprovedAppHost("evil.example")).toBe(false);
		expect(assertAppUrl("http://localhost:3000").ok).toBe(true);
		expect(assertAppUrl("http://127.0.0.1:3000").ok).toBe(true);
		expect(assertAppUrl("http://[::1]:3000").ok).toBe(true);
		expect(assertAppUrl("https://www.nexuscanon.com").ok).toBe(true);
		expect(assertAppUrl("https://afenda-lite.vercel.app").ok).toBe(true);
		expect(assertAppUrl("http://afenda-lite.vercel.app").ok).toBe(false);
		expect(assertAppUrl("ftp://localhost").ok).toBe(false);
		expect(assertAppUrl("https://evil.example").ok).toBe(false);
		expect(assertAppUrl("https://evil.example").issues[0]?.variable).toBe(
			"APP_URL",
		);
		expect(assertAppUrl("not-a-url").ok).toBe(false);
		expect(assertAppUrl("not-a-url").issues[0]?.message).toBe(
			"must be a valid URL",
		);
		expect(
			assertAppUrl("http://localhost:3000", { vercelEnv: "production" }).ok,
		).toBe(false);
		expect(
			assertAppUrl("https://www.nexuscanon.com", {
				vercelEnv: "production",
			}).ok,
		).toBe(true);
		expect(
			assertAppUrl("https://www.nexuscanon.com/app", {
				vercelEnv: "production",
			}).ok,
		).toBe(false);
		expect(
			assertAppUrl("https://www.nexuscanon.com?mode=test", {
				vercelEnv: "production",
			}).ok,
		).toBe(false);
		expect(
			assertAppUrl("https://user:password@www.nexuscanon.com", {
				vercelEnv: "production",
			}).ok,
		).toBe(false);
		expect(
			assertAppUrl("https://afenda-lite.vercel.app", {
				vercelEnv: "production",
			}).ok,
		).toBe(false);
		expect(
			assertAppUrl("http://www.nexuscanon.com", {
				vercelEnv: "production",
			}).ok,
		).toBe(false);
		expect(
			assertAppUrl("https://preview.vercel.app", {
				vercelEnv: "production",
			}).ok,
		).toBe(false);
	});

	it("identifies production-branch baseline-migrate prohibition without secrets", () => {
		expect(PRODUCTION_BASELINE_MIGRATE_PROHIBITED).toBe(true);
		const posture = evaluateProdBranchBaselineMigratePosture({
			branchId: APPROVED_NEON_BRANCH_ID,
		});
		expect(posture.ok).toBe(true);
		expect(posture.baselineMigrateAllowed).toBe(false);
		expect(posture.detail).toContain("prohibited");
		expect(posture.detail).toContain(APPROVED_NEON_BRANCH_ID);
		expect(posture.detail).not.toContain("postgresql://");
		expect(JSON.stringify(posture)).not.toContain("secret");

		const wrongBranch = evaluateProdBranchBaselineMigratePosture({
			branchId: "br-wrong-branch",
		});
		expect(wrongBranch.ok).toBe(false);
		expect(wrongBranch.baselineMigrateAllowed).toBe(false);
		expect(wrongBranch.issues[0]?.variable).toBe("NEON_BRANCH_ID");

		const unsetBranch = evaluateProdBranchBaselineMigratePosture({});
		expect(unsetBranch.ok).toBe(false);
		expect(unsetBranch.baselineMigrateAllowed).toBe(false);
		expect(unsetBranch.issues[0]?.variable).toBe("NEON_BRANCH_ID");
	});

	it("classifies production-required Neon Cloud ids explicitly", () => {
		expect(NEON_ENV_CLASSIFICATION.NEON_ORG_ID).toBe("required-production-ops");
		expect(NEON_ENV_CLASSIFICATION.NEON_PROJECT_ID).toBe(
			"required-production-ops",
		);
		expect(NEON_ENV_CLASSIFICATION.NEON_BRANCH_ID).toBe(
			"required-production-ops",
		);
		expect(NEON_ENV_CLASSIFICATION.NEON_API_KEY).toBe("local-only");
		expect(NEON_ENV_CLASSIFICATION.PLAYGROUND_SURVEY_ID).toBe("local-only");
		expect(NEON_ENV_CLASSIFICATION.SHADCN_STUDIO_API_KEY).toBe("local-only");
		expect(NEON_ENV_CLASSIFICATION.CRON_SECRET).toBe("server-secret");
		expect(NEON_ENV_CLASSIFICATION.AI_GATEWAY_API_KEY).toBe("server-secret");
		expect(NEON_ENV_CLASSIFICATION.HR_RELIABILITY_ENABLED).toBe("optional-ops");
	});

	it("keeps web runtime env keys classified and represented in .env.example", () => {
		const webSource = readFileSync(
			join(import.meta.dirname, "../src/web.ts"),
			"utf8",
		);
		const exampleSource = readFileSync(join(REPO_ROOT, ".env.example"), "utf8");
		const runtimeEnvBlock = webSource.match(/runtimeEnv:\s*{([\s\S]*?)\n\t},/);

		expect(runtimeEnvBlock).not.toBeNull();

		const runtimeEnvKeys = Array.from(
			runtimeEnvBlock?.[1].matchAll(
				/^\s+([A-Z0-9_]+):\s*process\.env\.[A-Z0-9_]+,?$/gm,
			) ?? [],
			(match) => match[1],
		).filter((key): key is string => key !== undefined);
		const missingClassifications = runtimeEnvKeys.filter(
			(key) => !(key in NEON_ENV_CLASSIFICATION),
		);
		const missingExamples = runtimeEnvKeys.filter(
			(key) => !new RegExp(`^#?\\s*${key}=`, "m").test(exampleSource),
		);

		expect(missingClassifications).toEqual([]);
		expect(missingExamples).toEqual([]);
	});

	it("locks Neon Cloud ids to the approved production branch policy", () => {
		expect(
			assertNeonCloudIds({
				orgId: APPROVED_NEON_ORG_ID,
				projectId: APPROVED_NEON_PROJECT_ID,
				branchId: APPROVED_NEON_BRANCH_ID,
			}).ok,
		).toBe(true);
		expect(assertNeonCloudIds({ branchId: "br-wrong-branch" }).ok).toBe(false);
		expect(assertNeonCloudIds({ requireAll: true }).ok).toBe(false);
		expect(assertNeonCloudIds({}).ok).toBe(true);
		expect(
			assertNeonCloudIds({ projectId: "wrong-project" }).issues[0]?.variable,
		).toBe("NEON_PROJECT_ID");
	});

	it("blocks local-only product config on Vercel production only", () => {
		expect(
			assertLocalOnlyConfigAbsentInProduction(
				{ NEON_API_KEY: "operator-key" },
				{},
			).ok,
		).toBe(true);
		const localOnly = assertLocalOnlyConfigAbsentInProduction(
			{
				NEON_API_KEY: "operator-key",
				PLAYGROUND_ENABLED: true,
				PLAYGROUND_SURVEY_ID: "survey-1",
				SHARED_ADMIN_EMAIL: "admin@example.com",
				E2E_FACTORY_HASH_TEMPLATE_EMAIL: "template@example.com",
				E2E_INVITEE_EMAIL: "invitee@example.com",
				E2E_INVITE_TOKEN: "invite-token",
				SHADCN_STUDIO_API_KEY: "studio-key",
			},
			{ vercelEnv: "production" },
		);
		expect(localOnly.ok).toBe(false);
		expect(localOnly.issues.map((issue) => issue.variable)).toEqual(
			expect.arrayContaining([
				"NEON_API_KEY",
				"PLAYGROUND_ENABLED",
				"PLAYGROUND_SURVEY_ID",
				"SHARED_ADMIN_EMAIL",
				"E2E_FACTORY_HASH_TEMPLATE_EMAIL",
				"E2E_INVITEE_EMAIL",
				"E2E_INVITE_TOKEN",
				"SHADCN_STUDIO_API_KEY",
			]),
		);
		expect(
			assertLocalOnlyConfigAbsentInProduction(
				{ PLAYGROUND_ENABLED: false, NEON_API_KEY: "" },
				{ vercelEnv: "production" },
			).ok,
		).toBe(true);
		expect(
			assertLocalOnlySecretsAbsentInProduction(
				{ SHARED_ADMIN_PASSWORD: "synced-by-mistake" },
				{ vercelEnv: "production" },
			).ok,
		).toBe(false);
		expect(isProductionDeployment({ vercelEnv: "production" })).toBe(true);
		expect(isProductionDeployment({ nodeEnv: "test" })).toBe(false);
		expect(isProductionDeployment({ nodeEnv: "production" })).toBe(false);
		expect(
			isProductionDeployment({ nodeEnv: "production", vercelEnv: "" }),
		).toBe(false);
		expect(
			isProductionDeployment({ nodeEnv: "production", vercelEnv: "staging" }),
		).toBe(true);
		expect(
			isProductionDeployment({
				nodeEnv: "production",
				vercelEnv: "preview",
			}),
		).toBe(false);
	});

	it("blocks PLAYGROUND_ENABLED on Vercel production", () => {
		expect(assertPlaygroundLocalOnly(true, {}).ok).toBe(true);
		expect(
			assertPlaygroundLocalOnly(true, { vercelEnv: "production" }).ok,
		).toBe(false);
	});

	it("requires paired optional secret configuration", () => {
		expect(
			assertPairedSecretConfig({
				leftName: "UPSTASH_REDIS_REST_URL",
				leftValue: "https://example.upstash.io",
				rightName: "UPSTASH_REDIS_REST_TOKEN",
				rightValue: "token",
			}).ok,
		).toBe(true);
		expect(
			assertPairedSecretConfig({
				leftName: "UPSTASH_REDIS_REST_URL",
				rightName: "UPSTASH_REDIS_REST_TOKEN",
			}).ok,
		).toBe(true);
		const missingToken = assertPairedSecretConfig({
			leftName: "UPSTASH_REDIS_REST_URL",
			leftValue: "https://example.upstash.io",
			rightName: "UPSTASH_REDIS_REST_TOKEN",
		});
		expect(missingToken.ok).toBe(false);
		expect(missingToken.issues[0]?.variable).toBe(
			"UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN",
		);
		expect(JSON.stringify(missingToken)).not.toContain(
			"https://example.upstash.io",
		);
		expect(
			assertPairedSecretConfig({
				leftName: "UPSTASH_REDIS_REST_URL",
				leftValue: "",
				rightName: "UPSTASH_REDIS_REST_TOKEN",
				rightValue: "",
			}).ok,
		).toBe(true);
		expect(
			assertPairedSecretConfig({
				leftName: "UPSTASH_REDIS_REST_URL",
				rightName: "UPSTASH_REDIS_REST_TOKEN",
				rightValue: "token",
			}).ok,
		).toBe(false);
	});

	it("evaluateNeonProductEnv accepts a valid local shape", () => {
		const result = evaluateNeonProductEnv({
			DATABASE_URL: POOLER_URL,
			NEON_AUTH_BASE_URL: AUTH_BASE,
			NEON_AUTH_COOKIE_SECRET: COOKIE_OK,
			APP_URL: "http://localhost:3000",
			NEON_ORG_ID: APPROVED_NEON_ORG_ID,
			NEON_PROJECT_ID: APPROVED_NEON_PROJECT_ID,
			NEON_BRANCH_ID: APPROVED_NEON_BRANCH_ID,
			SHARED_ADMIN_PASSWORD: "local-only",
		});
		expect(result.ok).toBe(true);
	});

	it("evaluateNeonProductEnv fails missing, malformed, and cross-env cases", () => {
		const missing = evaluateNeonProductEnv({});
		expect(missing.ok).toBe(false);
		expect(missing.issues.map((i) => i.variable)).toEqual(
			expect.arrayContaining([
				"DATABASE_URL",
				"NEON_AUTH_BASE_URL",
				"NEON_AUTH_COOKIE_SECRET",
				"APP_URL",
			]),
		);

		const malformed = evaluateNeonProductEnv({
			DATABASE_URL: DIRECT_URL,
			NEON_AUTH_BASE_URL: "http://bad.example/auth",
			NEON_AUTH_COOKIE_SECRET: "short",
			APP_URL: "http://localhost:3000",
			NEON_BRANCH_ID: "br-other",
		});
		expect(malformed.ok).toBe(false);
		expect(malformed.issues.map((i) => i.variable)).toEqual(
			expect.arrayContaining([
				"DATABASE_URL",
				"NEON_AUTH_BASE_URL",
				"NEON_AUTH_COOKIE_SECRET",
				"NEON_BRANCH_ID",
			]),
		);

		const prodLeak = evaluateNeonProductEnv(
			{
				DATABASE_URL: POOLER_URL,
				NEON_AUTH_BASE_URL: AUTH_BASE,
				NEON_AUTH_COOKIE_SECRET: COOKIE_OK,
				APP_URL: "https://www.nexuscanon.com",
				NEON_API_KEY: "operator-api-key",
				PLAYGROUND_SURVEY_ID: "survey-1",
				E2E_ORGANIZATION_ID: "org_1",
				E2E_INVITEE_PASSWORD: "invitee-password",
				SHADCN_STUDIO_API_KEY: "studio-key",
				SHARED_ADMIN_PASSWORD: "must-not-ship",
				PLAYGROUND_ENABLED: true,
			},
			{ vercelEnv: "production" },
		);
		expect(prodLeak.ok).toBe(false);
		expect(prodLeak.issues.map((i) => i.variable)).toEqual(
			expect.arrayContaining(["SHARED_ADMIN_PASSWORD", "PLAYGROUND_ENABLED"]),
		);
		expect(prodLeak.issues.map((i) => i.variable)).toEqual(
			expect.arrayContaining([
				"NEON_API_KEY",
				"PLAYGROUND_SURVEY_ID",
				"E2E_ORGANIZATION_ID",
				"E2E_INVITEE_PASSWORD",
				"SHADCN_STUDIO_API_KEY",
			]),
		);
		expect(JSON.stringify(prodLeak)).not.toContain("must-not-ship");

		const missingProdIds = evaluateNeonProductEnv(
			{
				DATABASE_URL: POOLER_URL,
				NEON_AUTH_BASE_URL: AUTH_BASE,
				NEON_AUTH_COOKIE_SECRET: COOKIE_OK,
				APP_URL: "https://www.nexuscanon.com",
				UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
				UPSTASH_REDIS_REST_TOKEN: "token",
			},
			{ vercelEnv: "production" },
		);
		expect(missingProdIds.ok).toBe(false);
		expect(missingProdIds.issues.map((i) => i.variable)).toEqual(
			expect.arrayContaining([
				"NEON_ORG_ID",
				"NEON_PROJECT_ID",
				"NEON_BRANCH_ID",
			]),
		);

		const validProduction = evaluateNeonProductEnv(
			{
				DATABASE_URL: POOLER_URL,
				NEON_AUTH_BASE_URL: AUTH_BASE,
				NEON_AUTH_COOKIE_SECRET: COOKIE_OK,
				APP_URL: "https://www.nexuscanon.com",
				NEON_ORG_ID: APPROVED_NEON_ORG_ID,
				NEON_PROJECT_ID: APPROVED_NEON_PROJECT_ID,
				NEON_BRANCH_ID: APPROVED_NEON_BRANCH_ID,
				UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
				UPSTASH_REDIS_REST_TOKEN: "token",
			},
			{ vercelEnv: "production" },
		);
		expect(validProduction.ok).toBe(true);

		const missingProdUpstash = evaluateNeonProductEnv(
			{
				DATABASE_URL: POOLER_URL,
				NEON_AUTH_BASE_URL: AUTH_BASE,
				NEON_AUTH_COOKIE_SECRET: COOKIE_OK,
				APP_URL: "https://www.nexuscanon.com",
				NEON_ORG_ID: APPROVED_NEON_ORG_ID,
				NEON_PROJECT_ID: APPROVED_NEON_PROJECT_ID,
				NEON_BRANCH_ID: APPROVED_NEON_BRANCH_ID,
			},
			{ vercelEnv: "production" },
		);
		expect(missingProdUpstash.ok).toBe(false);
		expect(missingProdUpstash.issues[0]?.variable).toBe(
			"UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN",
		);

		const partialUpstash = evaluateNeonProductEnv({
			DATABASE_URL: POOLER_URL,
			NEON_AUTH_BASE_URL: AUTH_BASE,
			NEON_AUTH_COOKIE_SECRET: COOKIE_OK,
			APP_URL: "https://www.nexuscanon.com",
			UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
		});
		expect(partialUpstash.ok).toBe(false);
		expect(partialUpstash.issues[0]?.variable).toBe(
			"UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN",
		);
		expect(JSON.stringify(partialUpstash)).not.toContain(
			"https://example.upstash.io",
		);

		const partialProductionUpstash = evaluateNeonProductEnv(
			{
				DATABASE_URL: POOLER_URL,
				NEON_AUTH_BASE_URL: AUTH_BASE,
				NEON_AUTH_COOKIE_SECRET: COOKIE_OK,
				APP_URL: "https://www.nexuscanon.com",
				NEON_ORG_ID: APPROVED_NEON_ORG_ID,
				NEON_PROJECT_ID: APPROVED_NEON_PROJECT_ID,
				NEON_BRANCH_ID: APPROVED_NEON_BRANCH_ID,
				UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
			},
			{ vercelEnv: "production" },
		);
		expect(partialProductionUpstash.ok).toBe(false);
		expect(
			partialProductionUpstash.issues.filter(
				(issue) =>
					issue.variable === "UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN",
			),
		).toHaveLength(1);
	});
});

describe("@afenda/env createEnv export", () => {
	afterEach(() => {
		restoreProcessEnv();
		vi.resetModules();
	});

	it("exports typed env under SKIP_ENV_VALIDATION", async () => {
		process.env.SKIP_ENV_VALIDATION = "true";
		const { env } = await import("../src/web");
		expect(env).toBeDefined();
		expect(typeof env).toBe("object");
	});

	it("exports sealed recovery helpers through the package barrel", async () => {
		process.env.SKIP_ENV_VALIDATION = "true";

		const barrel = await import("../src/index");

		expect(barrel.MAX_SNAPSHOT_NAME_CREATED_AT_DRIFT_SECONDS).toBe(60);
		expect(
			barrel.scheduledSnapshotNameTimestamp("snapshot_2026-07-16T17:00:05Z"),
		).toBe(Date.parse("2026-07-16T17:00:05Z"));
	});

	it("exports the current production deployment helper through the package barrel", async () => {
		setValidProductionWebEnv();
		process.env.NODE_ENV = "production";
		process.env.VERCEL_ENV = "production";

		const barrel = await import("../src/index");

		expect(barrel.isProductionDeploymentNow()).toBe(true);
	});

	it("does not classify local production-mode builds as deployments", async () => {
		setValidProductionWebEnv({
			VERCEL_ENV: undefined,
		});
		process.env.NODE_ENV = "production";
		delete process.env.VERCEL_ENV;

		const barrel = await importFreshWebEnv();

		expect(barrel.isProductionDeploymentNow()).toBe(false);
	});

	it("exports the current local-development runtime helper through the package barrel", async () => {
		setValidProductionWebEnv({
			NODE_ENV: "development",
			VERCEL_ENV: undefined,
		});

		const barrel = await importFreshWebEnv();

		expect(barrel.isDevelopmentRuntimeNow()).toBe(true);
	});

	it("does not classify Vercel development as local development", async () => {
		setValidProductionWebEnv({
			NODE_ENV: "development",
			VERCEL_ENV: "development",
		});

		const barrel = await importFreshWebEnv();

		expect(barrel.isDevelopmentRuntimeNow()).toBe(false);
	});

	it("does not evaluate docs environment from the product barrel", async () => {
		setValidProductionWebEnv();
		delete process.env.DOCS_URL;
		delete process.env.GITHUB_APP_ID;
		delete process.env.GITHUB_APP_PRIVATE_KEY;

		const barrel = await import("../src/index");

		expect(barrel.env.APP_URL).toBe("https://www.nexuscanon.com");
		expect("docsEnv" in barrel).toBe(false);
	});

	it("documents and maps the dedicated docs export without root re-export drift", () => {
		const packageJson = JSON.parse(
			readFileSync(join(import.meta.dirname, "../package.json"), "utf8"),
		) as { exports?: Record<string, { default?: string; types?: string }> };
		const readme = readFileSync(
			join(import.meta.dirname, "../README.md"),
			"utf8",
		);

		expect(packageJson.exports?.["./docs"]?.default).toBe("./src/docs.ts");
		expect(packageJson.exports?.["."]?.default).toBe("./src/index.ts");
		expect(readme).toContain("does not export or evaluate `docsEnv`");
		expect(readme).toContain("avoids loading web Neon schema");
		expect(readme).not.toContain("docsEnv` re-export");
	});
});

describe("web environment", () => {
	afterEach(() => {
		restoreProcessEnv();
		vi.resetModules();
	});

	it("does not allow SKIP_ENV_VALIDATION to bypass production validation", async () => {
		setValidProductionWebEnv({
			SKIP_ENV_VALIDATION: "true",
			DATABASE_URL: undefined,
		});

		await expect(importFreshWebEnv()).rejects.toThrow(
			"Invalid environment variables",
		);
	});

	it("requires all three Neon ids in production", async () => {
		setValidProductionWebEnv({
			NEON_ORG_ID: undefined,
			NEON_PROJECT_ID: undefined,
			NEON_BRANCH_ID: undefined,
		});

		await expect(importFreshWebEnv()).rejects.toThrow(
			"Invalid environment variables",
		);
	});

	it("requires both Upstash values in production", async () => {
		setValidProductionWebEnv({
			UPSTASH_REDIS_REST_URL: undefined,
			UPSTASH_REDIS_REST_TOKEN: undefined,
		});

		await expect(importFreshWebEnv()).rejects.toThrow(
			"Invalid environment variables",
		);
	});

	it("allows missing CRON_SECRET when HR worker is disabled", async () => {
		setValidProductionWebEnv({
			CRON_SECRET: undefined,
			HR_RELIABILITY_ENABLED: "false",
		});

		const { env } = await importFreshWebEnv();

		expect(env.HR_RELIABILITY_ENABLED).toBe(false);
		expect(env.CRON_SECRET).toBeUndefined();
	});

	it("requires CRON_SECRET when HR worker is enabled in production", async () => {
		setValidProductionWebEnv({
			CRON_SECRET: undefined,
			HR_RELIABILITY_ENABLED: "true",
		});

		await expect(importFreshWebEnv()).rejects.toThrow(
			"Invalid environment variables",
		);
	});

	it("rejects partial Upstash configuration", async () => {
		setValidProductionWebEnv({
			UPSTASH_REDIS_REST_TOKEN: undefined,
		});

		await expect(importFreshWebEnv()).rejects.toThrow(
			"Invalid environment variables",
		);
	});

	it("rejects local-only non-password configuration in production", async () => {
		setValidProductionWebEnv({
			NEON_API_KEY: "operator-key",
			PLAYGROUND_SURVEY_ID: "survey-1",
			E2E_ORGANIZATION_ID: "org_1",
			E2E_FACTORY_PASSWORD: "factory-password",
			E2E_INVITEE_EMAIL: "invitee@example.com",
			SHARED_ADMIN_EMAIL: "admin@example.com",
			SHADCN_STUDIO_API_KEY: "studio-key",
		});

		await expect(importFreshWebEnv()).rejects.toThrow(
			"Invalid environment variables",
		);
	});

	it("rejects partial E2E invitee credentials", async () => {
		setValidProductionWebEnv({
			E2E_INVITEE_EMAIL: "invitee@example.com",
			E2E_INVITEE_PASSWORD: undefined,
		});

		await expect(importFreshWebEnv()).rejects.toThrow(
			"Invalid environment variables",
		);
	});

	it("rejects partial E2E credentials", async () => {
		setValidProductionWebEnv({
			E2E_OPERATOR_EMAIL: "operator@example.com",
			E2E_OPERATOR_PASSWORD: undefined,
		});

		await expect(importFreshWebEnv()).rejects.toThrow(
			"Invalid environment variables",
		);
	});

	it("requires a playground target when playground is enabled", async () => {
		setValidProductionWebEnv({
			NODE_ENV: "development",
			APP_URL: "http://localhost:3000",
			PLAYGROUND_ENABLED: "true",
			PLAYGROUND_SURVEY_ID: undefined,
			PLAYGROUND_ASSIGNMENT_ID: undefined,
			PLAYGROUND_SURVEY_SLUG: undefined,
		});

		await expect(importFreshWebEnv()).rejects.toThrow(
			"Invalid environment variables",
		);
	});

	it("rejects local-only credentials in production", async () => {
		setValidProductionWebEnv({
			CLIENT_DEFAULT_PASSWORD: "local-only",
		});

		await expect(importFreshWebEnv()).rejects.toThrow(
			"Invalid environment variables",
		);
	});
});

describe("docs environment", () => {
	afterEach(() => {
		restoreDocsProcessEnv();
		vi.resetModules();
	});

	it("uses localhost outside production when DOCS_URL is absent", async () => {
		delete process.env.DOCS_URL;
		delete process.env.GITHUB_APP_ID;
		delete process.env.GITHUB_APP_PRIVATE_KEY;
		process.env.NODE_ENV = "development";
		delete process.env.VERCEL_ENV;

		const { docsEnv } = await importFreshDocsEnv();

		expect(docsEnv.DOCS_URL).toBe("http://localhost:3001");
	});

	it("uses localhost for local production-mode builds when DOCS_URL is absent", async () => {
		delete process.env.DOCS_URL;
		delete process.env.GITHUB_APP_ID;
		delete process.env.GITHUB_APP_PRIVATE_KEY;
		process.env.NODE_ENV = "production";
		delete process.env.VERCEL_ENV;

		const { docsEnv } = await importFreshDocsEnv();

		expect(docsEnv.DOCS_URL).toBe("http://localhost:3001");
	});

	it("requires DOCS_URL in Vercel production", async () => {
		delete process.env.DOCS_URL;
		delete process.env.GITHUB_APP_ID;
		delete process.env.GITHUB_APP_PRIVATE_KEY;
		process.env.NODE_ENV = "production";
		process.env.VERCEL_ENV = "production";

		await expect(importFreshDocsEnv()).rejects.toThrow(
			"Invalid environment variables",
		);
	});

	it("treats Vercel preview as non-production even when NODE_ENV is production", async () => {
		delete process.env.DOCS_URL;
		delete process.env.GITHUB_APP_ID;
		delete process.env.GITHUB_APP_PRIVATE_KEY;
		process.env.NODE_ENV = "production";
		process.env.VERCEL_ENV = "preview";

		const { docsEnv } = await importFreshDocsEnv();

		expect(docsEnv.DOCS_URL).toBe("http://localhost:3001");
	});

	it("fails closed for unknown VERCEL_ENV values when NODE_ENV is production", async () => {
		delete process.env.DOCS_URL;
		delete process.env.GITHUB_APP_ID;
		delete process.env.GITHUB_APP_PRIVATE_KEY;
		process.env.NODE_ENV = "production";
		process.env.VERCEL_ENV = "staging";

		await expect(importFreshDocsEnv()).rejects.toThrow(
			"Invalid environment variables",
		);
	});

	it("requires HTTPS DOCS_URL in production", async () => {
		process.env.DOCS_URL = "http://docs.example.com";
		delete process.env.GITHUB_APP_ID;
		delete process.env.GITHUB_APP_PRIVATE_KEY;
		process.env.NODE_ENV = "production";
		process.env.VERCEL_ENV = "production";

		await expect(importFreshDocsEnv()).rejects.toThrow(
			"Invalid environment variables",
		);
	});

	it("rejects localhost DOCS_URL in production", async () => {
		process.env.DOCS_URL = "https://localhost:3001";
		delete process.env.GITHUB_APP_ID;
		delete process.env.GITHUB_APP_PRIVATE_KEY;
		process.env.NODE_ENV = "production";
		process.env.VERCEL_ENV = "production";

		await expect(importFreshDocsEnv()).rejects.toThrow(
			"Invalid environment variables",
		);
	});

	it("rejects 127.0.0.1 DOCS_URL in production", async () => {
		process.env.DOCS_URL = "https://127.0.0.1:3001";
		delete process.env.GITHUB_APP_ID;
		delete process.env.GITHUB_APP_PRIVATE_KEY;
		process.env.NODE_ENV = "production";
		process.env.VERCEL_ENV = "production";

		await expect(importFreshDocsEnv()).rejects.toThrow(
			"Invalid environment variables",
		);
	});

	it("rejects IPv6 localhost DOCS_URL in production", async () => {
		process.env.DOCS_URL = "https://[::1]:3001";
		delete process.env.GITHUB_APP_ID;
		delete process.env.GITHUB_APP_PRIVATE_KEY;
		process.env.NODE_ENV = "production";
		process.env.VERCEL_ENV = "production";

		await expect(importFreshDocsEnv()).rejects.toThrow(
			"Invalid environment variables",
		);
	});

	it.each([
		["path", "https://docs.example.com/docs"],
		["query", "https://docs.example.com?preview=1"],
		["fragment", "https://docs.example.com#top"],
		["credentials", "https://user:password@docs.example.com"],
	])("rejects DOCS_URL with %s", async (_case, docsUrl) => {
		process.env.DOCS_URL = docsUrl;
		delete process.env.GITHUB_APP_ID;
		delete process.env.GITHUB_APP_PRIVATE_KEY;
		process.env.NODE_ENV = "production";
		process.env.VERCEL_ENV = "production";

		await expect(importFreshDocsEnv()).rejects.toThrow(
			"Invalid environment variables",
		);
	});

	it("allows GitHub credentials to both be absent", async () => {
		process.env.DOCS_URL = "https://docs.example.com";
		delete process.env.GITHUB_APP_ID;
		delete process.env.GITHUB_APP_PRIVATE_KEY;
		process.env.NODE_ENV = "production";
		process.env.VERCEL_ENV = "production";

		const { docsEnv } = await importFreshDocsEnv();

		expect(docsEnv.GITHUB_APP_ID).toBeUndefined();
		expect(docsEnv.GITHUB_APP_PRIVATE_KEY).toBeUndefined();
	});

	it("accepts complete GitHub App credentials", async () => {
		process.env.DOCS_URL = "https://docs.example.com";
		process.env.GITHUB_APP_ID = "123";
		process.env.GITHUB_APP_PRIVATE_KEY = GITHUB_PRIVATE_KEY;
		process.env.NODE_ENV = "production";
		process.env.VERCEL_ENV = "production";

		const { docsEnv } = await importFreshDocsEnv();

		expect(docsEnv.GITHUB_APP_ID).toBe("123");
		expect(docsEnv.GITHUB_APP_PRIVATE_KEY).toBe(GITHUB_PRIVATE_KEY_NORMALIZED);
	});

	it("rejects malformed GitHub App ID", async () => {
		process.env.DOCS_URL = "https://docs.example.com";
		process.env.GITHUB_APP_ID = "app-123";
		process.env.GITHUB_APP_PRIVATE_KEY = GITHUB_PRIVATE_KEY;
		process.env.NODE_ENV = "production";
		process.env.VERCEL_ENV = "production";

		await expect(importFreshDocsEnv()).rejects.toThrow(
			"Invalid environment variables",
		);
	});

	it("rejects GitHub App ID without private key", async () => {
		process.env.DOCS_URL = "https://docs.example.com";
		process.env.GITHUB_APP_ID = "123";
		delete process.env.GITHUB_APP_PRIVATE_KEY;
		process.env.NODE_ENV = "production";
		process.env.VERCEL_ENV = "production";

		await expect(importFreshDocsEnv()).rejects.toThrow(
			"Invalid environment variables",
		);
	});

	it("rejects GitHub private key without App ID", async () => {
		process.env.DOCS_URL = "https://docs.example.com";
		delete process.env.GITHUB_APP_ID;
		process.env.GITHUB_APP_PRIVATE_KEY = GITHUB_PRIVATE_KEY;
		process.env.NODE_ENV = "production";
		process.env.VERCEL_ENV = "production";

		await expect(importFreshDocsEnv()).rejects.toThrow(
			"Invalid environment variables",
		);
	});

	it("converts escaped private-key newlines", async () => {
		process.env.DOCS_URL = "http://localhost:3001";
		process.env.GITHUB_APP_ID = "123";
		process.env.GITHUB_APP_PRIVATE_KEY = GITHUB_PRIVATE_KEY;
		process.env.NODE_ENV = "development";
		delete process.env.VERCEL_ENV;

		const { docsEnv } = await importFreshDocsEnv();

		expect(docsEnv.GITHUB_APP_PRIVATE_KEY).toBe(GITHUB_PRIVATE_KEY_NORMALIZED);
	});

	it("rejects malformed PEM private keys", async () => {
		process.env.DOCS_URL = "http://localhost:3001";
		process.env.GITHUB_APP_ID = "123";
		process.env.GITHUB_APP_PRIVATE_KEY = "line-one\\nline-two";
		process.env.NODE_ENV = "development";
		delete process.env.VERCEL_ENV;

		await expect(importFreshDocsEnv()).rejects.toThrow(
			"Invalid environment variables",
		);
	});
});
