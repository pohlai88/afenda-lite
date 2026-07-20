import { fail, ok, type Result } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";
import { createMemoryPurchasingStore } from "../src/memory-store";
import {
	addPurchaseOrderLine,
	createDraftPurchaseOrder,
	listPurchaseOrders,
	postPurchaseOrder,
} from "../src/order";
import { PURCHASING_PERMISSION_CODES } from "../src/permissions";
import type { MutationPorts, OutboxFactInput } from "../src/ports";
import { createGrantingPurchasingAuthorization } from "./helpers/memory-authorization";
import {
	createMemoryMasterLookup,
	seedItem,
	seedParty,
	seedUom,
} from "./helpers/memory-masters";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const ORG = "org-a";
const PARTY = "10000000-0000-4000-8000-000000000001";
const ITEM = "20000000-0000-4000-8000-000000000001";
const UOM = "b1000000-0000-4000-8000-000000000001";

function harness(ports?: MutationPorts) {
	const store = createMemoryPurchasingStore();
	const masters = createMemoryMasterLookup({
		parties: [seedParty(ORG, PARTY, "SUP-A", "active")],
		items: [seedItem(ORG, ITEM, "SKU-A", UOM, "active")],
		uoms: [seedUom(UOM, "EA")],
		supplierPartyIds: [PARTY],
	});
	const authorization = createGrantingPurchasingAuthorization([
		...PURCHASING_PERMISSION_CODES,
	]);
	return {
		store,
		ports: ports ?? createMemoryMutationPorts(),
		masters,
		authorization,
	};
}

describe("@afenda/purchasing transactions", () => {
	it("rolls back entity write when outbox append fails", async () => {
		const failingOutbox: MutationPorts = {
			audit: {
				async record() {
					return ok({ id: "audit-1" });
				},
			},
			outbox: {
				async append(_input: OutboxFactInput): Promise<Result<{ id: string }>> {
					return fail("INTERNAL_ERROR", "forced outbox failure");
				},
			},
		};
		const ctx = harness(failingOutbox);
		const created = await createDraftPurchaseOrder(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-tx-1",
				idempotencyKey: "create:corr-tx-1",
				code: "PO-TX-1",
				partyId: PARTY,
				currencyCode: "USD",
			},
			ctx,
		);
		expect(created.ok).toBe(false);

		const empty = await listPurchaseOrders(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-list-empty",
				page: 1,
				pageSize: 50,
			},
			{ ...ctx, ports: createMemoryMutationPorts() },
		);
		expect(empty.ok).toBe(true);
		if (empty.ok) {
			expect(empty.data).toHaveLength(0);
		}

		// Same code must succeed — proves create rolled back (no unique residue).
		const retry = await createDraftPurchaseOrder(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-tx-2",
				idempotencyKey: "create:corr-tx-2",
				code: "PO-TX-1",
				partyId: PARTY,
				currencyCode: "USD",
			},
			{ ...ctx, ports: createMemoryMutationPorts() },
		);
		expect(retry.ok).toBe(true);
	});

	it("rejects post when expectedVersion does not match (optimistic concurrency)", async () => {
		const ctx = harness();
		const draft = await createDraftPurchaseOrder(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-tx-3",
				idempotencyKey: "create:corr-tx-3",
				code: "PO-TX-2",
				partyId: PARTY,
				currencyCode: "USD",
			},
			ctx,
		);
		expect(draft.ok).toBe(true);
		if (!draft.ok) {
			return;
		}
		await addPurchaseOrderLine(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-tx-4",
				idempotencyKey: "line:corr-tx-4",
				orderId: draft.data.id,
				itemId: ITEM,
				quantity: 1,
				unitPrice: "10",
			},
			ctx,
		);
		const conflict = await postPurchaseOrder(
			{
				organizationId: ORG,
				actorUserId: "user-1",
				correlationId: "corr-tx-5",
				idempotencyKey: "post:corr-tx-5",
				orderId: draft.data.id,
				expectedVersion: 1,
			},
			ctx,
		);
		expect(conflict.ok).toBe(false);
		if (!conflict.ok) {
			expect(conflict.code).toBe("CONFLICT");
			expect(conflict.message).toMatch(/version/i);
		}
	});
});
