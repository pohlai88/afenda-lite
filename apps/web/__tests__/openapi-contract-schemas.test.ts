import { describe, expect, it } from "vitest";
import { getLivenessSnapshot } from "@/modules/platform/domain/health";
import {
	livenessResponseSchema,
	readinessResponseSchema,
} from "@/modules/platform/schemas/health";

describe("OpenAPI contract schemas (I2.4)", () => {
	it("liveness snapshot matches OPEN-001 health schema", () => {
		const snap = getLivenessSnapshot(new Date("2026-07-15T12:00:00.000Z"));
		expect(livenessResponseSchema.parse(snap)).toEqual({
			status: "alive",
			timestamp: "2026-07-15T12:00:00.000Z",
		});
	});

	it("readiness schema accepts ready, degraded, and not_ready shapes", () => {
		const checkedAt = "2026-07-15T12:00:00.000Z";

		const ready = readinessResponseSchema.parse({
			status: "ready",
			checks: {
				storage: {
					provider: "postgres",
					status: "reachable",
					latencyMs: 4,
				},
				auth: {
					provider: "neon_auth",
					status: "configured",
					reachability: "reachable",
					latencyMs: 5,
				},
			},
			probes: [
				{
					name: "postgres",
					status: "up",
					critical: true,
					latencyMs: 4,
					checkedAt,
				},
				{
					name: "neon_auth",
					status: "up",
					critical: false,
					latencyMs: 5,
					checkedAt,
				},
			],
			topology: "neon-shared-schema",
			connection: { pooler: true, ssl: "require" },
			timestamp: checkedAt,
		});
		expect(ready.status).toBe("ready");
		expect(ready.checks.storage.provider).toBe("postgres");
		expect(ready.checks.storage.latencyMs).toBe(4);
		expect(ready.checks.auth.reachability).toBe("reachable");
		expect(ready.probes).toHaveLength(2);
		expect(ready.probes[0]?.critical).toBe(true);
		expect(ready.probes[1]?.critical).toBe(false);

		const degraded = readinessResponseSchema.parse({
			status: "degraded",
			checks: {
				storage: {
					provider: "postgres",
					status: "reachable",
					latencyMs: 2,
				},
				auth: {
					provider: "neon_auth",
					status: "misconfigured",
					reachability: "not_probed",
					latencyMs: 0,
				},
			},
			probes: [
				{
					name: "postgres",
					status: "up",
					critical: true,
					latencyMs: 2,
					checkedAt,
				},
				{
					name: "neon_auth",
					status: "skipped",
					critical: false,
					latencyMs: 0,
					checkedAt,
				},
			],
			topology: "neon-shared-schema",
			connection: { pooler: true, ssl: "require" },
			timestamp: checkedAt,
		});
		expect(degraded.status).toBe("degraded");
		expect(degraded.checks.auth.reachability).toBe("not_probed");

		const notReady = readinessResponseSchema.parse({
			status: "not_ready",
			checks: {
				storage: {
					provider: "postgres",
					status: "unreachable",
					latencyMs: 50,
				},
				auth: {
					provider: "neon_auth",
					status: "configured",
					reachability: "reachable",
					latencyMs: 3,
				},
			},
			probes: [
				{
					name: "postgres",
					status: "down",
					critical: true,
					latencyMs: 50,
					checkedAt,
				},
				{
					name: "neon_auth",
					status: "up",
					critical: false,
					latencyMs: 3,
					checkedAt,
				},
			],
			topology: "neon-shared-schema",
			connection: { pooler: false, ssl: "unknown" },
			timestamp: checkedAt,
		});
		expect(notReady.status).toBe("not_ready");
	});

	it("detects Neon pooler hosts for readiness connection flags", async () => {
		const { inspectDatabaseConnection } = await import(
			"@/modules/platform/domain/health"
		);
		expect(
			inspectDatabaseConnection(
				"postgresql://u:p@ep-x-pooler.example/db?sslmode=require",
			),
		).toEqual({ pooler: true, ssl: "require" });
		expect(inspectDatabaseConnection("not-a-url")).toEqual({
			pooler: false,
			ssl: "unknown",
		});
	});

	it("does not echo malformed DATABASE_URL secrets in connection inspect", async () => {
		const { inspectDatabaseConnection } = await import(
			"@/modules/platform/domain/health"
		);
		const malformed =
			"%%%user:SuperSecretPassw0rd@ep-x-pooler.example/db?sslmode=require&token=leak-me-token%%%";
		const result = inspectDatabaseConnection(malformed);
		expect(result).toEqual({ pooler: false, ssl: "unknown" });
		const serialized = JSON.stringify(result);
		expect(serialized).not.toContain(malformed);
		expect(serialized).not.toContain("SuperSecretPassw0rd");
		expect(serialized).not.toContain("leak-me-token");
		expect(serialized).not.toContain("sslmode=require");
		expect(serialized).not.toContain("ep-x-pooler.example");
	});
});
