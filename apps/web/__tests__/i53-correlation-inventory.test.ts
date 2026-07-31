/**
 * GUIDE-018 I5.3 — critical-path correlation inventory (API-007 Living).
 * Proves correlation helpers + Action wiring without inventing APM vendors.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { errorResult } from "@afenda/errors";
import { http } from "@afenda/http";
import { describe, expect, it } from "vitest";

const webRoot = join(import.meta.dirname, "..");

function readWeb(rel: string): string {
	return readFileSync(join(webRoot, rel), "utf8");
}

describe("I5.3 correlation helpers (API-007)", () => {
	it("mints and validates UUID correlation ids", () => {
		const id = http.correlation.create();
		expect(http.correlation.is(id)).toBe(true);
		expect(http.correlation.resolve(id)).toBe(id);
		expect(http.correlation.is("not-a-uuid")).toBe(false);
		expect(http.correlation.resolve("bad")).not.toBe("bad");
	});

	it("surfaces correlationId only in ActionFailure details for INTERNAL_ERROR", () => {
		const correlationId = http.correlation.create();
		const failure = errorResult.fail("INTERNAL_ERROR", { correlationId });
		expect(failure).toMatchObject({
			ok: false,
			code: "INTERNAL_ERROR",
			details: { correlationId },
		});
	});
});

describe("I5.3 critical-path wiring inventory", () => {
	const criticalActions = [
		"app/actions/invite-org-member.ts",
		"app/actions/assign-org-role.ts",
		"app/actions/revoke-org-role.ts",
	] as const;

	it("wires the HTTP correlation capability and canonical failures", () => {
		for (const rel of criticalActions) {
			const source = readWeb(rel);
			expect(source).toContain("http.correlation.create");
			expect(source).toContain('errorResult.fail("INTERNAL_ERROR"');
			expect(source).toContain("logger.event");
		}
	});

	it("stamps x-correlation-id from proxy session gate", () => {
		const proxy = readWeb("proxy.ts");
		expect(proxy).toContain("http.correlation.header");
		expect(proxy).toContain("http.correlation.resolve");
		expect(proxy).toContain("logger.event");
	});

	it("requires correlationId on recordRbacAudit writes", () => {
		const audit = readFileSync(
			join(webRoot, "../../packages/control-plane/admin/src/schemas/audit.ts"),
			"utf8",
		);
		expect(audit).toContain("correlationId");
		expect(audit).toContain("recordRbacAuditCommandSchema");
	});

	it("does not invent vendor APM dependencies in apps/web package.json", () => {
		const pkg = readWeb("package.json");
		expect(pkg).not.toMatch(/sentry|datadog|opentelemetry|@opentelemetry/i);
		// Structured logs use @afenda/logger (Pino stays inside that package).
		expect(pkg).toContain("@afenda/logger");
		expect(pkg).toContain("@afenda/http");
		expect(pkg).not.toMatch(/"pino"/);
	});
});
