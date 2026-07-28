import { randomUUID } from "node:crypto";

import { expect, it } from "vitest";

import {
	getItemById,
	getItemGroupById,
	getItemTemplateById,
	getItemVariantById,
	getOrganizationDimensionById,
	getPartyById,
	getPaymentTermById,
	getTaxRegistration,
	getWarehouseById,
} from "../../src";
import { createDrizzleHarness } from "../parity/parity-harness";

it("returns a tenant-safe miss for every mutable root through Drizzle", async () => {
	const harness = await createDrizzleHarness();
	try {
		const id = randomUUID();
		const input = { ...harness.queryContext(), id };
		const results = await Promise.all([
			getOrganizationDimensionById(input, {
				store: harness.store,
				authorization: harness.options.authorization,
			}),
			getPartyById(input, harness.options),
			getItemGroupById(input, harness.options),
			getItemById(input, harness.options),
			getWarehouseById(input, harness.options),
			getPaymentTermById(input, harness.options),
			getTaxRegistration(input, harness.options),
			getItemTemplateById(input, harness.options),
			getItemVariantById(input, harness.options),
		]);
		expect(results).toHaveLength(9);
		for (const result of results) {
			expect(result).toEqual({ ok: true, data: null });
		}
	} finally {
		await harness.cleanup();
	}
});
