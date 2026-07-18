/**
 * PL-S7 — Auth BFF route wiring honesty.
 * Proves `/api/auth/[...path]` exports GET/POST only from `createAuthApiHandlers`.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const bffRouteRelative = "app/api/auth/[...path]/route.ts";

describe("@afenda/web Auth BFF route (PL-S7)", () => {
	it("ships the catch-all Route Handler on disk", () => {
		expect(existsSync(path.join(webRoot, bffRouteRelative))).toBe(true);
	});

	it("exports GET and POST from createAuthApiHandlers", () => {
		const source = readFileSync(path.join(webRoot, bffRouteRelative), "utf-8");
		expect(source).toContain('from "@afenda/auth"');
		expect(source).toContain("createAuthApiHandlers");
		expect(source).toMatch(
			/export\s+const\s*\{\s*GET\s*,\s*POST\s*\}\s*=\s*createAuthApiHandlers\s*\(\s*\)/,
		);
	});

	it("does not export unsupported HTTP methods", () => {
		const source = readFileSync(path.join(webRoot, bffRouteRelative), "utf-8");
		expect(source).not.toMatch(/\bexport\s+(async\s+)?function\s+PUT\b/);
		expect(source).not.toMatch(/\bexport\s+(async\s+)?function\s+DELETE\b/);
		expect(source).not.toMatch(/\bexport\s+(async\s+)?function\s+PATCH\b/);
		expect(source).not.toMatch(/\bexport\s+const\s+\{\s*[^}]*\bPUT\b/);
		expect(source).not.toMatch(/\bexport\s+const\s+\{\s*[^}]*\bDELETE\b/);
		expect(source).not.toMatch(/\bexport\s+const\s+\{\s*[^}]*\bPATCH\b/);
	});

	it("does not import the Neon Auth SDK in the BFF route", () => {
		const source = readFileSync(path.join(webRoot, bffRouteRelative), "utf-8");
		expect(source).not.toMatch(/@neondatabase\/auth(?:\/|$|")/);
	});
});
