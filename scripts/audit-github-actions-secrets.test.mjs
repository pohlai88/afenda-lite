/**
 * Unit tests for N12 / I5.5 GitHub Actions secrets presence audit (no live gh).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	evaluateGithubActionsSecretsAudit,
	evaluateGithubActionsSecretsPresenceFromEnv,
	missingAlternateGroups,
	missingRequiredNames,
	parseGhNameListJson,
	REQUIRED_ACTIONS_SECRETS,
	REQUIRED_ACTIONS_VARS,
	REQUIRED_SECRET_ALTERNATE_GROUPS,
	sanitizeAuditOutput,
} from "./lib/github-actions-secrets-audit.mjs";

describe("github-actions-secrets-audit", () => {
	it("parses gh --json name lists", () => {
		assert.deepEqual(
			parseGhNameListJson(
				JSON.stringify([{ name: "DATABASE_URL" }, { name: "APP_URL" }]),
			),
			["DATABASE_URL", "APP_URL"],
		);
		assert.deepEqual(parseGhNameListJson("[]"), []);
	});

	it("detects missing required names", () => {
		assert.deepEqual(
			missingRequiredNames(["APP_URL"], ["APP_URL", "DATABASE_URL"]),
			["DATABASE_URL"],
		);
	});

	it("accepts either E2E factory password alternate", () => {
		assert.deepEqual(
			missingAlternateGroups(
				["E2E_FACTORY_PASSWORD"],
				REQUIRED_SECRET_ALTERNATE_GROUPS,
			),
			[],
		);
		assert.deepEqual(
			missingAlternateGroups(
				["PREVIEW_CLIENT_PASSWORD"],
				REQUIRED_SECRET_ALTERNATE_GROUPS,
			),
			[],
		);
		assert.deepEqual(
			missingAlternateGroups([], REQUIRED_SECRET_ALTERNATE_GROUPS),
			["E2E_FACTORY_PASSWORD|PREVIEW_CLIENT_PASSWORD"],
		);
	});

	it("passes when union covers deploy + e2e factory requirements", () => {
		const result = evaluateGithubActionsSecretsAudit({
			secretNames: [...REQUIRED_ACTIONS_SECRETS, "E2E_FACTORY_PASSWORD"],
			varNames: REQUIRED_ACTIONS_VARS,
		});
		assert.equal(result.ok, true);
		assert.deepEqual(result.missingSecrets, []);
		assert.deepEqual(result.missingSecretAlternates, []);
		assert.deepEqual(result.missingVars, []);
	});

	it("fails closed when factory password alternates are both missing", () => {
		const result = evaluateGithubActionsSecretsAudit({
			secretNames: REQUIRED_ACTIONS_SECRETS,
			varNames: REQUIRED_ACTIONS_VARS,
		});
		assert.equal(result.ok, false);
		assert.deepEqual(result.missingSecretAlternates, [
			"E2E_FACTORY_PASSWORD|PREVIEW_CLIENT_PASSWORD",
		]);
	});

	it("fails closed on missing secrets without echoing values", () => {
		const result = evaluateGithubActionsSecretsAudit({
			secretNames: ["APP_URL", "E2E_FACTORY_PASSWORD"],
			varNames: REQUIRED_ACTIONS_VARS,
		});
		assert.equal(result.ok, false);
		assert.ok(result.missingSecrets.includes("DATABASE_URL"));
		assert.ok(result.missingSecrets.includes("NEON_AUTH_COOKIE_SECRET"));
		const serialized = JSON.stringify(result);
		assert.equal(serialized.includes("postgres://"), false);
		assert.equal(serialized.includes("SECRET_PASSWORD"), false);
	});

	it("redacts secret-looking diagnostic text", () => {
		const cleaned = sanitizeAuditOutput(
			"fail postgres://user:SECRET_PASSWORD@host/db cookie_secret=abc123",
		);
		assert.equal(cleaned.includes("SECRET_PASSWORD"), false);
		assert.equal(cleaned.includes("abc123"), false);
		assert.match(cleaned, /postgres:\/\/\[redacted\]/);
	});

	it("in-CI env presence passes when all required injections are non-empty", () => {
		/** @type {Record<string, string>} */
		const env = {};
		for (const name of REQUIRED_ACTIONS_SECRETS) {
			env[name] = "set";
		}
		env.E2E_FACTORY_PASSWORD = "set";
		for (const name of REQUIRED_ACTIONS_VARS) {
			env[name] = "set";
		}
		const result = evaluateGithubActionsSecretsPresenceFromEnv(env);
		assert.equal(result.ok, true);
		assert.deepEqual(result.missingSecrets, []);
		assert.deepEqual(result.missingSecretAlternates, []);
		assert.deepEqual(result.missingVars, []);
	});

	it("in-CI env presence fails closed on empty injection without echoing values", () => {
		const result = evaluateGithubActionsSecretsPresenceFromEnv({
			APP_URL: "https://example.com",
			E2E_FACTORY_PASSWORD: "set",
			VERCEL_ORG_ID: "org",
			VERCEL_PROJECT_ID: "proj",
			TURBO_TEAM: "team",
		});
		assert.equal(result.ok, false);
		assert.ok(result.missingSecrets.includes("DATABASE_URL"));
		const serialized = JSON.stringify(result);
		assert.equal(serialized.includes("postgres://"), false);
		assert.equal(serialized.includes("SECRET_PASSWORD"), false);
	});
});
