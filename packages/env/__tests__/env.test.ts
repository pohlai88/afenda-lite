import { describe, expect, it } from "vitest";

import {
	APPROVED_NEON_BRANCH_ID,
	APPROVED_NEON_ORG_ID,
	APPROVED_NEON_PROJECT_ID,
	assertAppUrl,
	assertCookieSecret,
	assertLocalOnlySecretsAbsentInProduction,
	assertNeonAuthBaseUrl,
	assertNeonCloudIds,
	assertPlaygroundLocalOnly,
	assertProductDatabaseUrl,
	evaluateNeonProductEnv,
	isNeonPoolerDatabaseUrl,
	isProductionDeployment,
	redactEnvValue,
} from "../src/neon-contract";

const POOLER_URL =
	"postgresql://neondb_owner:secret@ep-example-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const DIRECT_URL =
	"postgresql://neondb_owner:secret@ep-example.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const AUTH_BASE =
	"https://ep-example.neonauth.c-2.ap-southeast-1.aws.neon.tech/neondb/auth";
const COOKIE_OK = "x".repeat(32);

describe("@afenda/env neon-contract", () => {
	it("detects pooler vs direct DATABASE_URL hosts", () => {
		expect(isNeonPoolerDatabaseUrl(POOLER_URL)).toBe(true);
		expect(isNeonPoolerDatabaseUrl(DIRECT_URL)).toBe(false);
		expect(assertProductDatabaseUrl(POOLER_URL).ok).toBe(true);
		expect(assertProductDatabaseUrl(DIRECT_URL).ok).toBe(false);
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
		expect(JSON.stringify(short)).not.toContain("too-short");
		expect(redactEnvValue("super-secret")).toBe("[redacted]");
	});

	it("allows http APP_URL locally but rejects http/localhost on Vercel production", () => {
		expect(assertAppUrl("http://localhost:3000").ok).toBe(true);
		expect(
			assertAppUrl("http://localhost:3000", { vercelEnv: "production" }).ok,
		).toBe(false);
		expect(
			assertAppUrl("https://afenda-lite.vercel.app", {
				vercelEnv: "production",
			}).ok,
		).toBe(true);
		expect(
			assertAppUrl("http://afenda-lite.vercel.app", {
				vercelEnv: "production",
			}).ok,
		).toBe(false);
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
		expect(
			assertNeonCloudIds({ projectId: "wrong-project" }).issues[0]?.variable,
		).toBe("NEON_PROJECT_ID");
	});

	it("blocks local-only autofill secrets on Vercel production only", () => {
		expect(
			assertLocalOnlySecretsAbsentInProduction(
				{ SHARED_ADMIN_PASSWORD: "local-dev-only" },
				{},
			).ok,
		).toBe(true);
		expect(
			assertLocalOnlySecretsAbsentInProduction(
				{ SHARED_ADMIN_PASSWORD: "synced-by-mistake" },
				{ vercelEnv: "production" },
			).ok,
		).toBe(false);
		expect(isProductionDeployment({ vercelEnv: "production" })).toBe(true);
		expect(isProductionDeployment({ nodeEnv: "production" })).toBe(false);
	});

	it("blocks PLAYGROUND_ENABLED on Vercel production", () => {
		expect(assertPlaygroundLocalOnly(true, {}).ok).toBe(true);
		expect(
			assertPlaygroundLocalOnly(true, { vercelEnv: "production" }).ok,
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
				APP_URL: "https://afenda-lite.vercel.app",
				SHARED_ADMIN_PASSWORD: "must-not-ship",
				PLAYGROUND_ENABLED: true,
			},
			{ vercelEnv: "production" },
		);
		expect(prodLeak.ok).toBe(false);
		expect(prodLeak.issues.map((i) => i.variable)).toEqual(
			expect.arrayContaining(["SHARED_ADMIN_PASSWORD", "PLAYGROUND_ENABLED"]),
		);
		expect(JSON.stringify(prodLeak)).not.toContain("must-not-ship");
	});
});

describe("@afenda/env createEnv export", () => {
	it("exports typed env under SKIP_ENV_VALIDATION", async () => {
		process.env.SKIP_ENV_VALIDATION = "true";
		const { env } = await import("../src/web");
		expect(env).toBeDefined();
		expect(typeof env).toBe("object");
	});
});
