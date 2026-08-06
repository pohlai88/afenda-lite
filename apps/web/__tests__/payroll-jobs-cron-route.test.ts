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
		get PAYROLL_JOBS_DRAIN_ENABLED() {
			return state.enabled;
		},
		PAYROLL_JOBS_DRAIN_BATCH_SIZE: 5,
		PAYROLL_JOBS_DRAIN_LEASE_SECONDS: 180,
		PAYROLL_JOBS_DRAIN_TIME_BUDGET_MS: 45_000,
	},
}));

vi.mock("@/modules/platform/domain/payroll-jobs-drain", () => ({
	runPayrollJobsDrain: state.run,
}));

import { GET } from "../app/api/cron/payroll-jobs/route";

describe("Payroll jobs cron route", () => {
	beforeEach(() => {
		state.secret = "cron-secret-that-is-at-least-32-characters";
		state.enabled = true;
		state.run.mockReset();
		state.run.mockResolvedValue({
			ok: true,
			data: {
				claimed: 2,
				succeeded: 2,
				failed: 0,
				timedOut: false,
			},
		});
	});

	it.each([undefined, "Basic malformed", "Bearer wrong-secret"])(
		"rejects missing or malformed authorization without running work",
		async (authorization) => {
			const response = await GET(
				new Request("http://local.test/api/cron/payroll-jobs", {
					headers: authorization === undefined ? {} : { authorization },
				}),
			);
			expect(response.status).toBe(401);
			expect(response.headers.get("Cache-Control")).toBe("no-store");
			await expect(response.json()).resolves.toMatchObject({
				error: { code: "UNAUTHORIZED" },
			});
			expect(state.run).not.toHaveBeenCalled();
		},
	);

	it("returns aggregate-only drain results for a valid secret", async () => {
		const response = await GET(
			new Request("http://local.test/api/cron/payroll-jobs", {
				headers: { authorization: `Bearer ${state.secret}` },
			}),
		);
		expect(response.status).toBe(200);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		const serialized = JSON.stringify(await response.json());
		expect(serialized).toContain('"claimed":2');
		expect(serialized).not.toContain("organizationId");
		expect(state.run).toHaveBeenCalledOnce();
	});

	it("returns zero aggregates without touching Neon while rollout is disabled", async () => {
		state.enabled = false;
		const response = await GET(
			new Request("http://local.test/api/cron/payroll-jobs", {
				headers: { authorization: `Bearer ${state.secret}` },
			}),
		);
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			data: { claimed: 0, succeeded: 0, failed: 0 },
		});
		expect(state.run).not.toHaveBeenCalled();
	});
});
