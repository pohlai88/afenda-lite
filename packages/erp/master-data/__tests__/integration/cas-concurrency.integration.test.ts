import { expect, it } from "vitest";

import { createParty, getPartyById, updateParty } from "../../src";
import { createDrizzleHarness } from "../parity/parity-harness";

it("allows exactly one concurrent update for the same expected version", async () => {
	const harness = await createDrizzleHarness();
	try {
		const created = await createParty(
			{
				...harness.context(),
				code: "CAS-RACE",
				name: "CAS Race",
				partyKind: "organization",
			},
			harness.options,
		);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}

		const results = await Promise.all([
			updateParty(
				{
					...harness.context(),
					id: created.data.id,
					expectedVersion: created.data.version,
					name: "CAS Winner A",
				},
				harness.options,
			),
			updateParty(
				{
					...harness.context(),
					id: created.data.id,
					expectedVersion: created.data.version,
					name: "CAS Winner B",
				},
				harness.options,
			),
		]);
		expect(results.filter((result) => result.ok)).toHaveLength(1);
		const conflict = results.find((result) => !result.ok);
		expect(conflict?.ok).toBe(false);
		if (conflict === undefined || conflict.ok) {
			return;
		}
		expect(conflict.code).toBe("CONFLICT");
		expect(conflict.details).toMatchObject({
			reason: "MASTER_VERSION_CONFLICT",
		});

		const current = await getPartyById(
			{ ...harness.queryContext(), id: created.data.id },
			harness.options,
		);
		expect(current.ok && current.data?.version).toBe(created.data.version + 1);
	} finally {
		await harness.cleanup();
	}
});
