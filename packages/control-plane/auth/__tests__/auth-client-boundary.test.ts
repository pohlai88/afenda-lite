/**
 * N5 — `@afenda/auth/client` must stay browser-safe.
 * No session/proxy/invitations/env imports in the client entry.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const clientSourcePath = path.join(packageRoot, "../src/client.ts");
const serverIndexPath = path.join(packageRoot, "../src/index.ts");
const MIDDLEWARE_EXPORT_PATTERN = /from\s*["']\.\/middleware["']/;

const FORBIDDEN_IMPORTS = [
	/\bfrom\s*["']\.\/session["']/,
	/\bfrom\s*["']\.\/proxy["']/,
	/\bfrom\s*["']\.\/invitations["']/,
	/\bfrom\s*["']\.\/api-handler["']/,
	/\bfrom\s*["']@afenda\/env["']/,
	/\bfrom\s*["']@neondatabase\/auth\/next\/server["']/,
	/\bimport\s+["']server-only["']/,
];

describe("@afenda/auth/client boundary (N5)", () => {
	it("does not import server-only modules or @afenda/env", () => {
		const source = readFileSync(clientSourcePath, "utf-8");
		const offenders = FORBIDDEN_IMPORTS.filter((pattern) =>
			pattern.test(source),
		).map((pattern) => pattern.toString());
		expect(offenders).toEqual([]);
	});

	it("exports one browser capability using the shared path projection", () => {
		const source = readFileSync(clientSourcePath, "utf-8");
		expect(source).toContain("export const authBrowser");
		expect(source).toContain("AUTH_PATHS");
		expect(source).not.toContain("resetBrowserAuthClientForTests");
	});
});

describe("@afenda/auth server barrel hygiene", () => {
	it("exports the server capability and durable types without legacy functions", () => {
		const source = readFileSync(serverIndexPath, "utf-8");
		expect(source).toContain("authServer");
		expect(source).toContain("CredentialAuthResult");
		expect(source).toContain("AuthBootstrap");
		expect(source).not.toContain("getSession");
		expect(source).not.toMatch(MIDDLEWARE_EXPORT_PATTERN);
		expect(source).not.toContain("./middleware");
	});
});
