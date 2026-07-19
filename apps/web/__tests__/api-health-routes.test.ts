/**
 * Thin RH smoke: health route handlers return portal `{ data }` envelopes.
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/platform/domain/health", () => ({
	getLivenessSnapshot: () => ({
		status: "alive",
		timestamp: "2026-07-15T12:00:00.000Z",
	}),
	getReadinessSnapshot: async () => ({
		status: "ready",
		checks: {
			storage: { provider: "postgres", status: "reachable" },
			auth: { provider: "neon_auth", status: "configured" },
		},
		topology: "neon-shared-schema",
		connection: { pooler: true, ssl: "require" },
		timestamp: "2026-07-15T12:00:00.000Z",
	}),
}));

import { GET as getLiveness } from "../app/api/health/liveness/route";
import { GET as getReadiness } from "../app/api/health/readiness/route";

describe("@afenda/web health Route Handlers", () => {
	it("liveness returns { data } with alive status", async () => {
		const response = getLiveness();
		expect(response.status).toBe(200);
		expect(response.headers.get("Cache-Control")).toBe("public, max-age=10");
		await expect(response.json()).resolves.toEqual({
			data: {
				status: "alive",
				timestamp: "2026-07-15T12:00:00.000Z",
			},
		});
	});

	it("readiness returns { data } with no-store", async () => {
		const response = await getReadiness();
		expect(response.status).toBe(200);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		const body = await response.json();
		expect(body).toMatchObject({
			data: { status: "ready" },
		});
	});
});
