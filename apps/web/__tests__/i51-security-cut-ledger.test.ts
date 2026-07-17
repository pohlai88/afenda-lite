/**
 * GUIDE-018 I5.1 — cut ledger + safe-error inventory for product Server Actions.
 * Isolation by-id proof: tenancy-isolation
 *   "I5.1: orgB cannot get/draft/save/submit orgA assignment by id"
 * plus declaration-submit-read orgB draft/get/submit denials.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(webRoot, "../..");
const actionsDir = path.join(webRoot, "app", "actions");

/** Product `"use server"` Actions in scope for I5.1 (permission-gate is shared helper). */
const PRODUCT_SERVER_ACTIONS = [
	"assign-org-role.ts",
	"revoke-org-role.ts",
	"invite-org-member.ts",
	"declaration-draft.ts",
	"submit-client-declaration.ts",
] as const;

const SAFE_ERROR_EVIDENCE = [
	"apps/web/__tests__/n12-audit-security-evidence.test.ts",
	"apps/web/__tests__/submit-client-declaration-action.test.ts",
	"apps/web/__tests__/safe-error-copy.test.ts",
] as const;

const SECRET_SURFACE_EVIDENCE = [
	"packages/env/src/web.ts",
	"scripts/audit-github-actions-secrets.mjs",
] as const;

describe("I5.1 cut ledger", () => {
	it("lists every product Server Action file on disk", () => {
		const onDisk = readdirSync(actionsDir).filter((name) =>
			name.endsWith(".ts"),
		);
		for (const file of PRODUCT_SERVER_ACTIONS) {
			expect(onDisk, `missing action ${file}`).toContain(file);
			const text = readFileSync(path.join(actionsDir, file), "utf8");
			expect(text).toMatch(/["']use server["']/);
		}
		expect(onDisk).toContain("permission-gate.ts");
		const gate = readFileSync(
			path.join(actionsDir, "permission-gate.ts"),
			"utf8",
		);
		expect(gate).not.toMatch(/["']use server["']/);
	});

	it("pins secret-surface and safe-error evidence paths", () => {
		for (const relative of [
			...SECRET_SURFACE_EVIDENCE,
			...SAFE_ERROR_EVIDENCE,
		]) {
			expect(
				existsSync(path.join(repoRoot, relative)),
				`missing ${relative}`,
			).toBe(true);
		}
	});

	it("keeps @afenda/env client schema empty (no NEXT_PUBLIC product secrets)", () => {
		const envSource = readFileSync(
			path.join(repoRoot, "packages/env/src/web.ts"),
			"utf8",
		);
		expect(envSource).toMatch(/client:\s*\{\s*\}/);
		expect(envSource).not.toMatch(/NEXT_PUBLIC_[A-Z0-9_]+/);
	});
});

describe("I5.1 safe-error Action inventory", () => {
	it("every product Action catch is bare and returns fixed INTERNAL_ERROR copy", () => {
		for (const file of PRODUCT_SERVER_ACTIONS) {
			const text = readFileSync(path.join(actionsDir, file), "utf8");
			const catchBlocks = [...text.matchAll(/\} catch ([^{]*)\{/g)];
			expect(
				catchBlocks.length,
				`${file} must have at least one catch`,
			).toBeGreaterThan(0);
			for (const match of catchBlocks) {
				const binding = match[1]?.trim() ?? "";
				expect(
					binding,
					`${file}: catch must be bare (no err binding) — got "${binding}"`,
				).toBe("");
			}
			expect(text).not.toMatch(/actionFail\([^)]*error\.message/);
			expect(text).not.toMatch(/actionFail\([^)]*err\.message/);
			expect(text).toMatch(/INTERNAL_ERROR/);
		}
	});

	it("invite Action audits before Neon so invite never runs without attribution", () => {
		const invite = readFileSync(
			path.join(actionsDir, "invite-org-member.ts"),
			"utf8",
		);
		expect(invite).toContain("stage: \"requested\"");
		expect(invite).toContain("was not sent");
		expect(invite).not.toContain(
			"Invitation was sent but the org-scoped audit write failed",
		);
	});
});
