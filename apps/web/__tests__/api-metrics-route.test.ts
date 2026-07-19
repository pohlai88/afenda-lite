/**
 * Prometheus scrape RH — fail closed without token; bearer gate when configured.
 * Proves health routeTemplate samples appear in scrape output.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const metricsEnvState = vi.hoisted(() => ({
	METRICS_SCRAPE_TOKEN: undefined as string | undefined,
}));

vi.mock("@afenda/env", () => ({
	env: {
		get METRICS_SCRAPE_TOKEN() {
			return metricsEnvState.METRICS_SCRAPE_TOKEN;
		},
	},
}));

vi.mock("@/modules/platform/domain/health", () => ({
	getLivenessSnapshot: () => ({
		status: "alive",
		timestamp: "2026-07-15T12:00:00.000Z",
	}),
	getReadinessSnapshot: async () => ({
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
	}),
}));

import { resetDefaultMetricsRegistryForTests } from "@afenda/metrics";

import { GET as getLiveness } from "../app/api/health/liveness/route";
import { GET as getMetrics } from "../app/api/metrics/route";

describe("@afenda/web metrics Route Handler", () => {
	beforeEach(() => {
		metricsEnvState.METRICS_SCRAPE_TOKEN = undefined;
		resetDefaultMetricsRegistryForTests();
	});

	it("returns 404 when METRICS_SCRAPE_TOKEN is unset (fail closed)", async () => {
		const response = await getMetrics(
			new Request("http://local.test/api/metrics"),
		);
		expect(response.status).toBe(404);
	});

	it("returns 401 when Authorization bearer is missing or wrong", async () => {
		metricsEnvState.METRICS_SCRAPE_TOKEN = "metrics-token-16ch";

		const missing = await getMetrics(
			new Request("http://local.test/api/metrics"),
		);
		expect(missing.status).toBe(401);

		const wrong = await getMetrics(
			new Request("http://local.test/api/metrics", {
				headers: { Authorization: "Bearer wrong-token-16ch!" },
			}),
		);
		expect(wrong.status).toBe(401);
	});

	it("returns Prometheus text when bearer matches", async () => {
		metricsEnvState.METRICS_SCRAPE_TOKEN = "metrics-token-16ch";

		const response = await getMetrics(
			new Request("http://local.test/api/metrics", {
				headers: { Authorization: "Bearer metrics-token-16ch" },
			}),
		);
		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toContain("text/plain");
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		const body = await response.text();
		expect(body).toContain("http_request_total");
	});

	it("includes health routeTemplate samples after a liveness hit", async () => {
		metricsEnvState.METRICS_SCRAPE_TOKEN = "metrics-token-16ch";

		const health = await getLiveness(
			new Request("http://local.test/api/health/liveness"),
		);
		expect(health.status).toBe(200);

		const scrape = await getMetrics(
			new Request("http://local.test/api/metrics", {
				headers: { Authorization: "Bearer metrics-token-16ch" },
			}),
		);
		expect(scrape.status).toBe(200);
		const body = await scrape.text();
		expect(body).toContain('route="/api/health/liveness"');
		expect(body).toContain('method="GET"');
	});
});
