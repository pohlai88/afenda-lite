import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
	secret: "cron-secret-that-is-at-least-32-characters",
	enabled: true,
	run: vi.fn(),
}));

vi.mock("@afenda/env", () => ({
	env: {
		get CRON_SECRET() {
			return state.secret;
		},
		get HR_RELIABILITY_ENABLED() {
			return state.enabled;
		},
		HR_RELIABILITY_BATCH_SIZE: 25,
		HR_RELIABILITY_CONCURRENCY: 4,
		HR_RELIABILITY_PER_ORG_LIMIT: 5,
		HR_RELIABILITY_LEASE_SECONDS: 120,
		HR_RELIABILITY_TIME_BUDGET_MS: 45_000,
	},
}));

vi.mock("@/modules/platform/domain/human-resources-reliability-worker", () => ({
	runProductionReliabilityScheduler: state.run,
}));

import { GET } from "../app/api/cron/hr-reliability/route";

describe("HR reliability cron route", () => {
	beforeEach(() => {
		state.secret = "cron-secret-that-is-at-least-32-characters";
		state.enabled = true;
		state.run.mockReset();
		state.run.mockResolvedValue({
			ok: true,
			data: {
				claimed: 2,
				succeeded: 1,
				awaitingAcknowledgement: 1,
				retried: 0,
				deadLettered: 0,
				failed: 0,
				timedOut: false,
			},
		});
	});

	it.each([
		undefined,
		"Basic malformed",
		"Bearer wrong-secret",
	])("rejects missing or malformed authorization without running work", async (authorization) => {
		const response = await GET(
			new Request("http://local.test/api/cron/hr-reliability", {
				headers: authorization === undefined ? {} : { authorization },
			}),
		);
		expect(response.status).toBe(401);
		expect(state.run).not.toHaveBeenCalled();
	});

	it("returns aggregate-only scheduler results for a valid secret", async () => {
		const response = await GET(
			new Request("http://local.test/api/cron/hr-reliability", {
				headers: { authorization: `Bearer ${state.secret}` },
			}),
		);
		expect(response.status).toBe(200);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		const serialized = JSON.stringify(await response.json());
		expect(serialized).toContain('"claimed":2');
		expect(serialized).not.toContain("organizationId");
		expect(serialized).not.toContain("workItemId");
		expect(serialized).not.toContain("receiptId");
	});

	it("returns zero aggregates without touching Neon while rollout is disabled", async () => {
		state.enabled = false;
		const response = await GET(
			new Request("http://local.test/api/cron/hr-reliability", {
				headers: { authorization: `Bearer ${state.secret}` },
			}),
		);
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ data: { claimed: 0 } });
		expect(state.run).not.toHaveBeenCalled();
	});
});
