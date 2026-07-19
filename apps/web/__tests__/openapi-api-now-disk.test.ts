/**
 * api-now Route Handlers on disk (docs-V2/api/rest.md).
 * Bidirectional: allowlisted files exist; no orphan app/api route.ts files.
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiRoot = path.join(webRoot, "app", "api");

/** docs-V2 api-now allowlist (paths relative to apps/web). */
const API_NOW_ROUTE_FILES = [
	"app/api/health/liveness/route.ts",
	"app/api/health/readiness/route.ts",
	"app/api/metrics/route.ts",
	"app/api/auth/[...path]/route.ts",
	"app/api/session/sync-cookies/route.ts",
	"app/api/session/ensure-active-organization/route.ts",
] as const;

function collectRouteFiles(dir: string, relativePrefix: string): string[] {
	if (!existsSync(dir)) {
		return [];
	}
	const entries = readdirSync(dir);
	const found: string[] = [];
	for (const entry of entries) {
		const absolute = path.join(dir, entry);
		const relative = path.posix.join(relativePrefix, entry);
		if (statSync(absolute).isDirectory()) {
			found.push(...collectRouteFiles(absolute, relative));
			continue;
		}
		if (entry === "route.ts") {
			found.push(relative);
		}
	}
	return found;
}

describe("@afenda/web OpenAPI / REST api-now disk honesty", () => {
	it("ships Route Handlers for every api-now HTTP surface", () => {
		const missing = API_NOW_ROUTE_FILES.filter(
			(relative) => !existsSync(path.join(webRoot, relative)),
		);
		expect(missing).toEqual([]);
	});

	it("has no Route Handlers outside the api-now allowlist", () => {
		const onDisk = collectRouteFiles(apiRoot, "app/api").map((relative) =>
			relative.replaceAll("\\", "/"),
		);
		const allow = new Set<string>(API_NOW_ROUTE_FILES);
		const orphans = onDisk.filter((relative) => !allow.has(relative));
		expect(orphans).toEqual([]);
	});

	it("ships OpenAPI YAML under docs-V2/api (Scratch authority)", () => {
		const yamlPath = path.join(
			webRoot,
			"..",
			"..",
			"docs-V2",
			"api",
			"OPEN-001-openapi.yaml",
		);
		expect(existsSync(yamlPath)).toBe(true);
	});
});
