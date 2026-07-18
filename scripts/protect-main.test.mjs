/**
 * Unit tests for I5.5 main branch protection contract (no live gh).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	buildMainProtectionPutBody,
	evaluateMainProtection,
	REQUIRED_MAIN_STATUS_CHECKS,
	readProtectionSnapshot,
} from "./lib/protect-main.mjs";

describe("protect-main", () => {
	it("reads contexts from classic contexts array", () => {
		const snap = readProtectionSnapshot({
			required_status_checks: {
				strict: true,
				contexts: ["journey", "quality"],
			},
			allow_force_pushes: { enabled: false },
			allow_deletions: { enabled: false },
		});
		assert.deepEqual(snap.contexts, ["journey", "quality"]);
		assert.equal(snap.strict, true);
	});

	it("reads contexts from checks[].context", () => {
		const snap = readProtectionSnapshot({
			required_status_checks: {
				strict: true,
				checks: [{ context: "quality", app_id: 1 }],
			},
			allow_force_pushes: { enabled: false },
			allow_deletions: { enabled: false },
		});
		assert.deepEqual(snap.contexts, ["quality"]);
	});

	it("fails closed on stale journey + missing quality alignment", () => {
		const result = evaluateMainProtection({
			required_status_checks: {
				strict: true,
				contexts: ["quality", "journey"],
			},
			allow_force_pushes: { enabled: false },
			allow_deletions: { enabled: false },
		});
		assert.equal(result.ok, false);
		assert.deepEqual(result.staleContexts, ["journey"]);
		assert.deepEqual(result.requiredContexts, [...REQUIRED_MAIN_STATUS_CHECKS]);
	});

	it("passes when Living quality-only contract matches", () => {
		const result = evaluateMainProtection({
			required_status_checks: {
				strict: true,
				contexts: ["quality"],
			},
			allow_force_pushes: { enabled: false },
			allow_deletions: { enabled: false },
		});
		assert.equal(result.ok, true);
		assert.deepEqual(result.missingContexts, []);
		assert.deepEqual(result.staleContexts, []);
	});

	it("fails when force push or deletions allowed", () => {
		const result = evaluateMainProtection({
			required_status_checks: {
				strict: true,
				contexts: ["quality"],
			},
			allow_force_pushes: { enabled: true },
			allow_deletions: { enabled: false },
		});
		assert.equal(result.ok, false);
		assert.equal(result.allowForcePushes, true);
	});

	it("build put body uses Living contexts only", () => {
		const body = buildMainProtectionPutBody();
		assert.deepEqual(body.required_status_checks.contexts, ["quality"]);
		assert.equal(body.required_status_checks.strict, true);
		assert.equal(body.allow_force_pushes, false);
		assert.equal(body.allow_deletions, false);
	});
});
