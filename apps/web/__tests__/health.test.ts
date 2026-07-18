import { beforeEach, describe, expect, it, vi } from "vitest";

const executeMock = vi.hoisted(() => vi.fn());

/** Mutable env double — product `env` is readonly; probes read fields at call time. */
const mockEnv = vi.hoisted(() => ({
	DATABASE_URL: "postgresql://u:p@ep-x-pooler.example/db?sslmode=require",
	NEON_AUTH_BASE_URL: "https://auth.example.com",
	NEON_AUTH_COOKIE_SECRET: "x".repeat(32),
}));

vi.mock("@afenda/db", () => ({
	db: {
		execute: executeMock,
	},
	sql: (strings: TemplateStringsArray) => strings.join(""),
}));

vi.mock("@afenda/env", () => ({
	MAX_SELECT1_LATENCY_MS: 50,
	env: mockEnv,
}));

import {
	getLivenessSnapshot,
	getReadinessSnapshot,
	inspectDatabaseConnection,
} from "@/modules/platform/domain/health";
import {
	livenessResponseSchema,
	readinessResponseSchema,
} from "@/modules/platform/schemas/health";

describe("platform health probes (PL-S8)", () => {
	beforeEach(() => {
		executeMock.mockReset();
		mockEnv.NEON_AUTH_BASE_URL = "https://auth.example.com";
		mockEnv.NEON_AUTH_COOKIE_SECRET = "x".repeat(32);
		mockEnv.DATABASE_URL =
			"postgresql://u:p@ep-x-pooler.example/db?sslmode=require";
	});

	it("liveness is process-up only", () => {
		const snap = getLivenessSnapshot(new Date("2026-07-15T12:00:00.000Z"));
		expect(livenessResponseSchema.parse(snap)).toEqual({
			status: "alive",
			timestamp: "2026-07-15T12:00:00.000Z",
		});
		expect(executeMock).not.toHaveBeenCalled();
	});

	it("reports ready when DB reachable and auth configured", async () => {
		executeMock.mockResolvedValueOnce([]);
		const snap = await getReadinessSnapshot(
			new Date("2026-07-15T12:00:00.000Z"),
		);
		expect(readinessResponseSchema.parse(snap)).toEqual({
			status: "ready",
			checks: {
				storage: { provider: "postgres", status: "reachable" },
				auth: { provider: "neon_auth", status: "configured" },
			},
			topology: "neon-shared-schema",
			connection: { pooler: true, ssl: "require" },
			timestamp: "2026-07-15T12:00:00.000Z",
		});
	});

	it("reports degraded when auth misconfigured and DB reachable", async () => {
		executeMock.mockResolvedValueOnce([]);
		mockEnv.NEON_AUTH_COOKIE_SECRET = "short";
		const snap = await getReadinessSnapshot(
			new Date("2026-07-15T12:00:00.000Z"),
		);
		expect(snap.status).toBe("degraded");
		expect(snap.checks.auth).toEqual({
			provider: "neon_auth",
			status: "misconfigured",
		});
		expect(snap.checks.storage.status).toBe("reachable");
	});

	it("reports not_ready when DB unreachable — never ready", async () => {
		executeMock.mockRejectedValueOnce(new Error("ECONNREFUSED"));
		const snap = await getReadinessSnapshot(
			new Date("2026-07-15T12:00:00.000Z"),
		);
		expect(snap.status).toBe("not_ready");
		expect(snap.checks.storage).toEqual({
			provider: "postgres",
			status: "unreachable",
		});
		expect(snap.status).not.toBe("ready");
	});

	it("reports not_ready when select 1 exceeds timeout", async () => {
		executeMock.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					setTimeout(resolve, 200);
				}),
		);
		const snap = await getReadinessSnapshot(
			new Date("2026-07-15T12:00:00.000Z"),
		);
		expect(snap.status).toBe("not_ready");
		expect(snap.checks.storage.status).toBe("unreachable");
	});

	it("never echoes secrets in readiness JSON", async () => {
		const secretUrl =
			"postgresql://user:SuperSecretPassw0rd@ep-x-pooler.example/db?sslmode=require&token=leak-me-token";
		mockEnv.DATABASE_URL = secretUrl;
		mockEnv.NEON_AUTH_COOKIE_SECRET = "cookie-secret-value-32chars-min!!";
		executeMock.mockResolvedValueOnce([]);
		const snap = await getReadinessSnapshot(
			new Date("2026-07-15T12:00:00.000Z"),
		);
		const serialized = JSON.stringify(snap);
		expect(serialized).not.toContain("SuperSecretPassw0rd");
		expect(serialized).not.toContain("leak-me-token");
		expect(serialized).not.toContain(secretUrl);
		expect(serialized).not.toContain(mockEnv.NEON_AUTH_COOKIE_SECRET);
		expect(serialized).not.toContain("cookie-secret");
	});

	it("inspectDatabaseConnection never echoes malformed URL secrets", () => {
		const malformed =
			"%%%user:SuperSecretPassw0rd@ep-x-pooler.example/db?sslmode=require&token=leak-me-token%%%";
		const result = inspectDatabaseConnection(malformed);
		expect(result).toEqual({ pooler: false, ssl: "unknown" });
		const serialized = JSON.stringify(result);
		expect(serialized).not.toContain("SuperSecretPassw0rd");
		expect(serialized).not.toContain("leak-me-token");
	});
});
