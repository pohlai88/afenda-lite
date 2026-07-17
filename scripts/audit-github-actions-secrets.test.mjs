/**
 * Unit tests for N12 GitHub Actions secrets presence audit (no live gh).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	evaluateGithubActionsSecretsAudit,
	missingRequiredNames,
	parseGhNameListJson,
	REQUIRED_ACTIONS_SECRETS,
	REQUIRED_ACTIONS_VARS,
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

	it("passes when union covers deploy.yml requirements", () => {
		const result = evaluateGithubActionsSecretsAudit({
			secretNames: REQUIRED_ACTIONS_SECRETS,
			varNames: REQUIRED_ACTIONS_VARS,
		});
		assert.equal(result.ok, true);
		assert.deepEqual(result.missingSecrets, []);
		assert.deepEqual(result.missingVars, []);
	});

	it("fails closed on missing secrets without echoing values", () => {
		const result = evaluateGithubActionsSecretsAudit({
			secretNames: ["APP_URL"],
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
});
