import { describe, expect, it } from "vitest";

import {
	createMemoryAccountingStore,
	getTrialBalance,
	openAccountingPeriod,
} from "../src/index";

describe("accounting authorization", () => {
	it("requires manage for commands and read for queries", async () => {
		const seen: string[] = [];
		const options = {
			store: createMemoryAccountingStore(),
			authorization: {
				async can(input: { permission: string }) {
					seen.push(input.permission);
					return false;
				},
			},
		};
		const command = await openAccountingPeriod(
			{
				organizationId: "org-1",
				actorUserId: "user-1",
				code: "2026-07",
				startDate: "2026-07-01",
				endDate: "2026-07-31",
			},
			options,
		);
		const query = await getTrialBalance(
			{ organizationId: "org-1", actorUserId: "user-1" },
			options,
		);
		expect(command.ok).toBe(false);
		expect(query.ok).toBe(false);
		expect(seen).toEqual(["accounting.manage", "accounting.read"]);
	});

	it("fails closed without an authorization port or organization scope", async () => {
		const store = createMemoryAccountingStore();
		const unauthorized = await getTrialBalance(
			{ organizationId: "org-1", actorUserId: "user-1" },
			{ store },
		);
		expect(unauthorized).toMatchObject({ ok: false, code: "UNAUTHORIZED" });
		const missingOrg = await getTrialBalance(
			{ actorUserId: "user-1" },
			{
				store,
				authorization: {
					async can() {
						return true;
					},
				},
			},
		);
		expect(missingOrg).toMatchObject({ ok: false, code: "BAD_REQUEST" });
	});
});
