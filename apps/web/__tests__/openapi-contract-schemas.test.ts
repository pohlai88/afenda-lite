import { describe, expect, it } from "vitest";
import {
	declarationDraftQuerySchema,
	saveClientDeclarationDraftSchema,
} from "@/modules/declarations/schemas/client";
import { parseSchema } from "@/modules/declarations/schemas/common";
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

	it("readiness schema accepts ready and degraded shapes", () => {
		const ready = readinessResponseSchema.parse({
			status: "ready",
			topology: "neon-shared-schema",
			storage: "postgres",
			connection: { pooler: true, ssl: "require" },
			auth: "configured",
			timestamp: "2026-07-15T12:00:00.000Z",
		});
		expect(ready.status).toBe("ready");

		const degraded = readinessResponseSchema.parse({
			status: "degraded",
			topology: "neon-shared-schema",
			storage: "unreachable",
			connection: { pooler: false, ssl: "unknown" },
			auth: "missing",
			timestamp: "2026-07-15T12:00:00.000Z",
		});
		expect(degraded.status).toBe("degraded");
	});

	it("validates declaration draft query and write bodies", () => {
		const assignmentId = "550e8400-e29b-41d4-a716-446655440000";
		const questionId = "550e8400-e29b-41d4-a716-446655440001";

		expect(parseSchema(declarationDraftQuerySchema, { assignmentId })).toEqual({
			success: true,
			data: { assignmentId },
		});

		const write = parseSchema(saveClientDeclarationDraftSchema, {
			assignmentId,
			answers: { [questionId]: true },
			stepIndex: 2,
		});
		expect(write.success).toBe(true);
		if (write.success) {
			expect(write.data.stepIndex).toBe(2);
		}
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
});
