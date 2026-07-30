import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { upsertPartiesByCode } from "../../src";
import {
	createDrizzleHarness,
	createMemoryHarness,
	type ParityHarness,
	type StoreFactory,
} from "./parity-harness";

function defineImportContractTests(
	name: string,
	createStore: StoreFactory,
): void {
	describe(name, () => {
		let harness: ParityHarness;

		beforeEach(async () => {
			harness = await createStore();
		});

		afterEach(async () => {
			await harness.cleanup();
		});

		it("replays a claimed payload and rejects a changed payload", async () => {
			const idempotencyKey = "parity-import-key";
			const rows = [
				{
					code: "PARITY-IMPORT-PARTY",
					name: "Parity Import Party",
					partyKind: "organization" as const,
				},
			];
			const input = {
				...harness.context(),
				sourceSystem: "parity-suite",
				dryRun: false as const,
				approved: true as const,
				idempotencyKey,
				rows,
			};

			const first = await upsertPartiesByCode(input, harness.options);
			expect(first.ok).toBe(true);
			if (!first.ok) {
				return;
			}
			expect(first.data).toMatchObject({ created: 1, updated: 0 });

			const replay = await upsertPartiesByCode(
				{ ...input, correlationId: harness.context().correlationId },
				harness.options,
			);
			expect(replay).toEqual(first);

			const conflict = await upsertPartiesByCode(
				{
					...input,
					correlationId: harness.context().correlationId,
					rows: [{ ...rows[0], name: "Changed Payload" }],
				},
				harness.options,
			);
			expect(conflict.ok).toBe(false);
			if (conflict.ok) {
				return;
			}
			expect(conflict.details).toMatchObject({
				reason: "MASTER_IDEMPOTENCY_CONFLICT",
				errorCode: "MASTER_DATA_IDEMPOTENCY_CONFLICT",
			});
		});
	});
}

defineImportContractTests("MemoryMasterDataStore import", createMemoryHarness);
defineImportContractTests(
	"DrizzleMasterDataStore import",
	createDrizzleHarness,
);
