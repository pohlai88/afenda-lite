import { ok, type Result } from "@afenda/errors/result";

import type {
	PurchaseOrderReceivingQueryPort,
	PurchaseOrderReceivingSnapshot,
} from "../../src/ports";

export function postedPoSnapshot(
	overrides?: Partial<PurchaseOrderReceivingSnapshot> & {
		lineId?: string;
		ordered?: string;
		received?: string;
		overReceiptTolerancePercent?: string;
	},
): PurchaseOrderReceivingSnapshot {
	const lineId = overrides?.lineId ?? "60000000-0000-4000-8000-000000000001";
	const ordered = overrides?.ordered ?? "10";
	const received = overrides?.received ?? "0";
	const orderedNum = Number(ordered);
	const receivedNum = Number(received);
	const remaining = String(Math.max(0, orderedNum - receivedNum));
	return {
		status: overrides?.status ?? "posted",
		version: overrides?.version ?? 1,
		lines: overrides?.lines ?? [
			{
				purchaseOrderLineId: lineId,
				ordered,
				received,
				remaining,
				overReceiptTolerancePercent:
					overrides?.overReceiptTolerancePercent ?? "0",
			},
		],
	};
}

/**
 * Test double — seedable by purchaseOrderId.
 * Missing keys return null (missing / cross-org).
 */
export function createMemoryPurchaseOrderReceivingQueryPort(
	seed:
		| Map<string, PurchaseOrderReceivingSnapshot>
		| Record<string, PurchaseOrderReceivingSnapshot> = {},
): PurchaseOrderReceivingQueryPort & {
	snapshots: Map<string, PurchaseOrderReceivingSnapshot>;
	setSnapshot(
		purchaseOrderId: string,
		snapshot: PurchaseOrderReceivingSnapshot | null,
	): void;
} {
	const snapshots =
		seed instanceof Map ? new Map(seed) : new Map(Object.entries(seed));

	return {
		snapshots,
		setSnapshot(purchaseOrderId, snapshot) {
			if (snapshot === null) {
				snapshots.delete(purchaseOrderId);
				return;
			}
			snapshots.set(purchaseOrderId, snapshot);
		},
		async getReceivingSnapshot(input: {
			organizationId: string;
			purchaseOrderId: string;
		}): Promise<Result<PurchaseOrderReceivingSnapshot | null>> {
			void input.organizationId;
			return ok(snapshots.get(input.purchaseOrderId) ?? null);
		},
	};
}
