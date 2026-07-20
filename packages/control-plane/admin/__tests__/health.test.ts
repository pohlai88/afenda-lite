import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const dbExecute = vi.fn();
const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

vi.mock("@afenda/db", () => ({
	db: {
		execute: (...args: unknown[]) => dbExecute(...args),
	},
	sql: (strings: TemplateStringsArray) => strings.join(""),
}));

const mockedEnv = vi.hoisted(() => ({
	DATABASE_URL:
		"postgresql://u:p@ep-x-pooler.region.aws.neon.tech/neondb?sslmode=require",
	NEON_AUTH_BASE_URL: "https://auth.example.com",
	NEON_AUTH_COOKIE_SECRET: "x".repeat(32),
}));

vi.mock("@afenda/env", () => ({
	env: mockedEnv,
	MAX_SELECT1_LATENCY_MS: 50,
}));

describe("@afenda/admin health probes", () => {
	beforeEach(() => {
		dbExecute.mockReset();
		fetchMock.mockReset();
		vi.resetModules();
		mockedEnv.DATABASE_URL =
			"postgresql://u:p@ep-x-pooler.region.aws.neon.tech/neondb?sslmode=require";
		mockedEnv.NEON_AUTH_BASE_URL = "https://auth.example.com";
		mockedEnv.NEON_AUTH_COOKIE_SECRET = "x".repeat(32);
		fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
	});

	it("getLivenessSnapshot is process-up only", async () => {
		const { getLivenessSnapshot } = await import("../src/health");
		const now = new Date("2026-07-20T00:00:00.000Z");
		expect(getLivenessSnapshot(now)).toEqual({
			status: "alive",
			timestamp: "2026-07-20T00:00:00.000Z",
		});
		expect(dbExecute).not.toHaveBeenCalled();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("getReadinessSnapshot reports ready when DB and Auth HTTP probes succeed", async () => {
		dbExecute.mockResolvedValue([{ "?column?": 1 }]);
		const { getReadinessSnapshot } = await import("../src/health");
		const snapshot = await getReadinessSnapshot(
			new Date("2026-07-20T00:00:00.000Z"),
		);
		expect(snapshot.status).toBe("ready");
		expect(snapshot.checks.storage.status).toBe("reachable");
		expect(snapshot.checks.storage.latencyMs).toBeGreaterThanOrEqual(0);
		expect(snapshot.checks.auth).toMatchObject({
			status: "configured",
			reachability: "reachable",
		});
		expect(snapshot.checks.auth.latencyMs).toBeGreaterThanOrEqual(0);
		expect(snapshot.probes).toEqual([
			expect.objectContaining({
				name: "postgres",
				status: "up",
				critical: true,
			}),
			expect.objectContaining({
				name: "neon_auth",
				status: "up",
				critical: false,
			}),
		]);
		expect(snapshot.connection.pooler).toBe(true);
		expect(dbExecute).toHaveBeenCalled();
		expect(fetchMock).toHaveBeenCalledWith(
			"https://auth.example.com",
			expect.objectContaining({ method: "GET" }),
		);
	});

	it("getReadinessSnapshot is not_ready when select 1 fails", async () => {
		dbExecute.mockRejectedValue(new Error("connection refused"));
		const { getReadinessSnapshot } = await import("../src/health");
		const snapshot = await getReadinessSnapshot(
			new Date("2026-07-20T00:00:00.000Z"),
		);
		expect(snapshot.status).toBe("not_ready");
		expect(snapshot.checks.storage.status).toBe("unreachable");
		expect(snapshot.probes).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: "postgres", status: "down" }),
			]),
		);
	});

	it("getReadinessSnapshot marks timeout as unreachable with measured latencyMs", async () => {
		dbExecute.mockImplementation(
			() =>
				new Promise((resolve) => {
					setTimeout(resolve, 200);
				}),
		);
		const { getReadinessSnapshot } = await import("../src/health");
		const snapshot = await getReadinessSnapshot(
			new Date("2026-07-20T00:00:00.000Z"),
		);
		expect(snapshot.status).toBe("not_ready");
		expect(snapshot.checks.storage.status).toBe("unreachable");
		expect(snapshot.checks.storage.latencyMs).toBeGreaterThanOrEqual(50);
	});

	it("getReadinessSnapshot is degraded when auth config is incomplete (no fetch)", async () => {
		dbExecute.mockResolvedValue([{ "?column?": 1 }]);
		mockedEnv.NEON_AUTH_COOKIE_SECRET = "short";
		const { getReadinessSnapshot } = await import("../src/health");
		const snapshot = await getReadinessSnapshot(
			new Date("2026-07-20T00:00:00.000Z"),
		);
		expect(snapshot.status).toBe("degraded");
		expect(snapshot.checks.auth).toEqual({
			provider: "neon_auth",
			status: "misconfigured",
			reachability: "not_probed",
			latencyMs: 0,
		});
		expect(snapshot.probes).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: "neon_auth", status: "skipped" }),
			]),
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("getReadinessSnapshot is degraded when Auth HTTP probe fails", async () => {
		dbExecute.mockResolvedValue([{ "?column?": 1 }]);
		fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
		const { getReadinessSnapshot } = await import("../src/health");
		const snapshot = await getReadinessSnapshot(
			new Date("2026-07-20T00:00:00.000Z"),
		);
		expect(snapshot.status).toBe("degraded");
		expect(snapshot.checks.auth.reachability).toBe("unreachable");
		expect(snapshot.probes).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: "neon_auth", status: "down" }),
			]),
		);
	});

	it("getHealthAggregate never hardcodes connected:true without probes", async () => {
		dbExecute.mockRejectedValue(new Error("down"));
		fetchMock.mockRejectedValue(new Error("down"));
		const { getHealthAggregate } = await import("../src/health");
		const aggregate = await getHealthAggregate(
			new Date("2026-07-20T00:00:00.000Z"),
		);
		expect(aggregate.liveness.status).toBe("alive");
		expect(aggregate.readiness.status).toBe("not_ready");
		expect(aggregate.readiness.checks.storage.status).toBe("unreachable");
	});
});
