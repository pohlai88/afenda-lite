/**
 * Thin RH smoke: health route handlers return portal `{ data }` envelopes.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const healthRouteState = vi.hoisted(() => {
	const readySnapshot = {
		status: "ready" as const,
		checks: {
			storage: {
				provider: "postgres" as const,
				status: "reachable" as const,
				latencyMs: 3,
			},
			auth: {
				provider: "neon_auth" as const,
				status: "configured" as const,
				reachability: "reachable" as const,
				latencyMs: 5,
			},
		},
		probes: [
			{
				name: "postgres" as const,
				status: "up" as const,
				critical: true,
				latencyMs: 3,
				checkedAt: "2026-07-15T12:00:00.000Z",
			},
			{
				name: "neon_auth" as const,
				status: "up" as const,
				critical: false,
				latencyMs: 5,
				checkedAt: "2026-07-15T12:00:00.000Z",
			},
		],
		topology: "neon-shared-schema" as const,
		connection: { pooler: true, ssl: "require" },
		timestamp: "2026-07-15T12:00:00.000Z",
	};

	type ReadinessSnapshot = {
		status: "ready" | "degraded" | "not_ready";
		checks: {
			storage: {
				provider: "postgres";
				status: "reachable" | "unreachable";
				latencyMs: number;
			};
			auth: {
				provider: "neon_auth";
				status: "configured" | "misconfigured";
				reachability: "reachable" | "unreachable";
				latencyMs: number;
			};
		};
		probes: Array<{
			name: "postgres" | "neon_auth";
			status: "up" | "down";
			critical: boolean;
			latencyMs: number;
			checkedAt: string;
		}>;
		topology: "neon-shared-schema";
		connection: { pooler: boolean; ssl: string };
		timestamp: string;
	};

	return {
		readySnapshot: readySnapshot as ReadinessSnapshot,
		readinessSnapshot: structuredClone(readySnapshot) as ReadinessSnapshot,
	};
});

vi.mock("@/modules/platform/domain/health", () => ({
	getLivenessSnapshot: () => ({
		status: "alive",
		timestamp: "2026-07-15T12:00:00.000Z",
	}),
	getReadinessSnapshot: async () => healthRouteState.readinessSnapshot,
}));

import { GET as getLiveness } from "../app/api/health/liveness/route";
import { GET as getReadiness } from "../app/api/health/readiness/route";

describe("@afenda/web health Route Handlers", () => {
	beforeEach(() => {
		healthRouteState.readinessSnapshot = structuredClone(
			healthRouteState.readySnapshot,
		);
	});

	it("liveness returns { data } with alive status", async () => {
		const response = await getLiveness(
			new Request("http://local.test/api/health/liveness"),
		);
		expect(response.status).toBe(200);
		expect(response.headers.get("Cache-Control")).toBe("public, max-age=10");
		expect(response.headers.get("x-correlation-id")).toMatch(
			/^[0-9a-f-]{36}$/i,
		);
		expect(response.headers.get("Server-Timing")).toMatch(
			/^health_liveness;dur=\d+(\.\d)?$/,
		);
		await expect(response.json()).resolves.toEqual({
			data: {
				status: "alive",
				timestamp: "2026-07-15T12:00:00.000Z",
			},
		});
	});

	it("readiness returns { data } with no-store and 200 when ready", async () => {
		const response = await getReadiness(
			new Request("http://local.test/api/health/readiness"),
		);
		expect(response.status).toBe(200);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		expect(response.headers.get("x-correlation-id")).toMatch(
			/^[0-9a-f-]{36}$/i,
		);
		expect(response.headers.get("Server-Timing")).toMatch(
			/^health_readiness;dur=\d+(\.\d)?$/,
		);
		const body = await response.json();
		expect(body).toMatchObject({
			data: { status: "ready" },
		});
	});

	it("readiness returns 503 with { data } when not_ready", async () => {
		healthRouteState.readinessSnapshot = {
			...structuredClone(healthRouteState.readySnapshot),
			status: "not_ready",
			checks: {
				...healthRouteState.readySnapshot.checks,
				storage: {
					provider: "postgres",
					status: "unreachable",
					latencyMs: 50,
				},
			},
			probes: [
				{
					name: "postgres",
					status: "down",
					critical: true,
					latencyMs: 50,
					checkedAt: "2026-07-15T12:00:00.000Z",
				},
				{
					name: "neon_auth",
					status: "up",
					critical: false,
					latencyMs: 5,
					checkedAt: "2026-07-15T12:00:00.000Z",
				},
			],
		};
		const response = await getReadiness(
			new Request("http://local.test/api/health/readiness"),
		);
		expect(response.status).toBe(503);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		const body = await response.json();
		expect(body).toMatchObject({
			data: { status: "not_ready" },
		});
	});
});
