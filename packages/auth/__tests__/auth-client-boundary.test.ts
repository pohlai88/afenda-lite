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

	it("exports AUTH_API_BASE_PATH and getBrowserAuthClient", () => {
		const source = readFileSync(clientSourcePath, "utf-8");
		expect(source).toContain("AUTH_API_BASE_PATH");
		expect(source).toContain("export function getBrowserAuthClient");
		expect(source).toContain('from "@neondatabase/auth/next"');
	});
});

describe("@afenda/auth server barrel hygiene", () => {
	it("exports AuthBootstrap and CredentialAuthResult types without a middleware subpath", () => {
		const source = readFileSync(serverIndexPath, "utf-8");
		expect(source).toContain("export type { CredentialAuthResult }");
		expect(source).toContain("AuthBootstrap");
		expect(source).not.toMatch(/from\s*["']\.\/middleware["']/);
		expect(source).not.toContain("./middleware");
	});
});
