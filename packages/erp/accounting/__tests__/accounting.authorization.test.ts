import { ok } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";

import { createMemoryStore, getTrialBalance, openAccountingPeriod } from "../src/index";

const organizationId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const actorUserId = "a47ac10b-58cc-4372-a567-0e02b2c3d479";

describe("accounting authorization", () => {
	it("requires fine-grained codes for commands and queries", async () => {
		const seen: string[] = [];
		const options = {
			store: createMemoryStore(),
			authorization: {
				async can(input: { permission: string }) {
					seen.push(input.permission);
					return false;
				},
			},
			effects: {
				async emit() {
					return ok(undefined);
				},
			},
		};
		const command = await openAccountingPeriod(
			{
				organizationId,
				actorUserId,
				correlationId: "test",
				code: "2026-07",
				startDate: "2026-07-01",
				endDate: "2026-07-31",
			},
			options,
		);
		const query = await getTrialBalance(
			{ organizationId, actorUserId },
			options,
		);
		expect(command.ok).toBe(false);
		expect(query.ok).toBe(false);
		expect(seen).toEqual(["accounting.period.open", "accounting.trial_balance.read"]);
	});

	it("fails closed without an authorization port", async () => {
		const store = createMemoryStore();
		const effects = {
			async emit() {
				return ok(undefined);
			},
		};
		const unauthorized = await getTrialBalance(
			{ organizationId, actorUserId },
			{ store, effects },
		);
		expect(unauthorized).toMatchObject({ ok: false });
	});
});
