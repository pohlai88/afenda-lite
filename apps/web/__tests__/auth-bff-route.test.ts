/**
 * N5 — Auth BFF route wiring honesty.
 * Proves `/api/auth/[...path]` exports GET/POST from `createAuthApiHandlers`.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const bffRouteRelative = "app/api/auth/[...path]/route.ts";

describe("@afenda/web Auth BFF route (N5)", () => {
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
});
