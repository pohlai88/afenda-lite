import { errorResult } from "@afenda/errors";
import type { SalesCommandOptions } from "../../src/command-options";
import type { MasterDataSnapshotPort } from "../../src/ports";
import {
	allowAllSalesAuthorization,
	createMemorySalesStore,
} from "../../src/testing";

export const ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";
export const OTHER_ORGANIZATION_ID = "22222222-2222-4222-8222-222222222222";
export const ACTOR_USER_ID = "33333333-3333-4333-8333-333333333333";
export const PARTY_ID = "44444444-4444-4444-8444-444444444444";
export const ITEM_ID = "55555555-5555-4555-8555-555555555555";
export const UOM_ID = "66666666-6666-4666-8666-666666666666";

export function mutationContext(idempotencyKey: string) {
	return {
		organizationId: ORGANIZATION_ID,
		actorUserId: ACTOR_USER_ID,
		correlationId: `test:${idempotencyKey}`,
		idempotencyKey,
	};
}

export const masterData: MasterDataSnapshotPort = {
	resolveCustomer(input) {
		return Promise.resolve(
			errorResult.ok({
				partyId: input.partyId,
				code: "CUST-001",
				name: "Acme Trading",
				paymentTermCode: "NET30",
				paymentTermName: "Net 30",
				netDays: 30,
			}),
		);
	},
	resolveItem(input) {
		return Promise.resolve(
			errorResult.ok({
				itemId: input.itemId,
				code: "ITEM-001",
				name: "Industrial Widget",
				baseUomId: input.requestedUomId ?? UOM_ID,
				baseUomCode: "EA",
			}),
		);
	},
};

export function createHarness(): Required<
	Pick<SalesCommandOptions, "store" | "authorization" | "masterData" | "clock">
> {
	return {
		store: createMemorySalesStore(),
		authorization: allowAllSalesAuthorization(),
		masterData,
		clock: { now: () => new Date("2026-07-28T00:00:00.000Z") },
	};
}
