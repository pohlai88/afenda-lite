/**
 * GUIDE-018 I2.4 — OpenAPI api-now paths must have Route Handlers on disk.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const API_NOW_ROUTE_FILES = [
	"app/api/health/liveness/route.ts",
	"app/api/health/readiness/route.ts",
	"app/api/client/declaration-draft/route.ts",
	"app/api/auth/[...path]/route.ts",
] as const;

describe("@afenda/web OpenAPI / REST api-now disk honesty (I2.4)", () => {
	it("ships Route Handlers for every Living api-now HTTP surface", () => {
		const missing = API_NOW_ROUTE_FILES.filter(
			(relative) => !existsSync(path.join(webRoot, relative)),
		);
		expect(missing).toEqual([]);
	});
});
