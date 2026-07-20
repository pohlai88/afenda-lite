/**
 * GUIDE-018 I5.3 — critical-path correlation inventory (API-007 Living).
 * Proves correlation helpers + Action wiring without inventing APM vendors.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	CORRELATION_HEADER,
	createCorrelationId,
	isCorrelationId,
	resolveCorrelationId,
} from "@afenda/http";
import { describe, expect, it } from "vitest";
import { actionFailInternal } from "../modules/platform/schemas/action-result";

const webRoot = join(import.meta.dirname, "..");

function readWeb(rel: string): string {
	return readFileSync(join(webRoot, rel), "utf8");
}

describe("I5.3 correlation helpers (API-007)", () => {
	it("mints and validates UUID correlation ids", () => {
		const id = createCorrelationId();
		expect(isCorrelationId(id)).toBe(true);
		expect(resolveCorrelationId(id)).toBe(id);
		expect(isCorrelationId("not-a-uuid")).toBe(false);
		expect(resolveCorrelationId("bad")).not.toBe("bad");
	});

	it("surfaces correlationId only in ActionFailure details for INTERNAL_ERROR", () => {
		const correlationId = createCorrelationId();
		const failure = actionFailInternal("Safe message.", correlationId);
		expect(failure).toEqual({
			ok: false,
			code: "INTERNAL_ERROR",
			message: "Safe message.",
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

	it("wires createCorrelationId + actionFailInternal on critical Actions", () => {
		for (const rel of criticalActions) {
			const source = readWeb(rel);
			expect(source).toContain("createCorrelationId");
			expect(source).toContain("actionFailInternal");
			expect(source).toContain("logProductEvent");
		}
	});

	it("stamps x-correlation-id from proxy session gate", () => {
		const proxy = readWeb("proxy.ts");
		expect(proxy).toContain(CORRELATION_HEADER);
		expect(proxy).toContain("resolveCorrelationId");
		expect(proxy).toContain("logProductEvent");
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
