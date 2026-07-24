import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
	formatHrInstant,
	parseHrDisplayPreferences,
} from "../features/human-resources/display-preferences";
import { reconcileHrQueueHealth } from "../features/human-resources/operations-health";
import { parseHrPage } from "../features/human-resources/pagination";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function source(relativePath: string): string {
	return readFileSync(path.join(webRoot, relativePath), "utf8");
}

describe("human resources Phase 7 surfaces", () => {
	it("normalizes pagination, locale, and timezone at the RSC boundary", () => {
		expect(parseHrPage("-3")).toBe(1);
		expect(parseHrPage("4")).toBe(4);
		expect(
			parseHrDisplayPreferences({
				locale: "unknown",
				timeZone: "Mars/Olympus_Mons",
			}),
		).toEqual({
			locale: "en",
			timeZone: "Asia/Kuala_Lumpur",
		});
		expect(
			formatHrInstant("2026-07-24T00:00:00.000Z", {
				locale: "en",
				timeZone: "Asia/Kuala_Lumpur",
			}),
		).toContain("8:00");
	});

	it("keeps all role routes thin and delegated to feature shells", () => {
		const routes = [
			"app/(client)/client/(workspace)/human-resources/page.tsx",
			"app/(client)/client/(workspace)/human-resources/manager/page.tsx",
			"app/(operator)/admin/human-resources/page.tsx",
			"app/(operator)/admin/human-resources/candidates/page.tsx",
			"app/(operator)/admin/human-resources/operations/page.tsx",
		];

		for (const route of routes) {
			const text = source(route);
			expect(text).toContain("parseHrDisplayPreferences");
			expect(text).toContain("parseHrPage");
			expect(text).toContain("@/features/human-resources/");
			expect(text).not.toContain("@afenda/db");
		}
	});

	it("uses the UI flat barrel and session-scoped package reads", () => {
		const shell = source("features/human-resources/human-resources-shell.tsx");
		expect(shell).toContain('from "@afenda/ui-system"');
		expect(shell).not.toMatch(/@afenda\/ui-system\//);
		expect(shell).toContain("requirePermission");
		expect(shell).toContain("organizationId: session.orgId");
		expect(shell).toContain("actorUserId: session.userId");
		expect(shell).toContain('sourceModule: "human-resources"');
	});

	it("requires an exact HR failed-event lookup before recovery", () => {
		const action = source("app/actions/hr-operations.ts");
		expect(action).toContain(
			'confirmation: z.literal("RETRY_FAILED_HR_EVENT")',
		);
		expect(action).toContain('sourceModule: "human-resources"');
		expect(action).toContain('status: "failed"');
		expect(action).toContain("organizationId: session.orgId");
	});

	it("fails the HR queue SLO on stale work or cross-boundary rows", () => {
		const event = {
			id: "event-1",
			type: "human-resources.employee.created.v1",
			sourceModule: "identity" as const,
			occurredAt: new Date("2026-07-24T00:00:00.000Z"),
			correlationId: "corr-1",
			causationId: null,
			organizationId: "org-1",
			actorUserId: "user-1",
			payload: {},
			metadata: null,
			status: "pending" as const,
			attempts: 0,
			lastError: null,
			processedAt: null,
		};
		const page = { entries: [event], total: 1, page: 1, pageSize: 25 };
		const health = reconcileHrQueueHealth({
			pending: page,
			failed: { entries: [], total: 0, page: 1, pageSize: 25 },
			processed: { entries: [], total: 0, page: 1, pageSize: 25 },
			stalePending: page,
		});

		expect(health.sloHealthy).toBe(false);
		expect(health.stalePending).toBe(1);
		expect(health.reconciliationIssues).toContain(
			"pending queue contains a cross-boundary event",
		);
	});
});
