import { parseQuantity } from "./store";
import type { StockBalance } from "./types";

type ReconcileLedgerEntry = {
	warehouseId: string;
	itemId: string;
	quantityDelta: string;
};

type ReconcileReservation = {
	warehouseId: string;
	itemId: string;
	quantity: string;
	consumedQuantity: string;
};

type ReconcileInput = {
	ledgerEntries: ReconcileLedgerEntry[];
	balances: StockBalance[];
	activeReservations: ReconcileReservation[];
};

type ReconcileResult = { ok: true } | { ok: false; findings: string[] };

function keyFor(warehouseId: string, itemId: string): string {
	return `${warehouseId}:${itemId}`;
}

function formatKey(key: string): string {
	const [warehouseId, itemId] = key.split(":");
	return `warehouse=${warehouseId} item=${itemId}`;
}

function sameNumericString(left: string, right: string): boolean {
	return parseQuantity(left) === parseQuantity(right);
}

function addQuantity(map: Map<string, number>, key: string, delta: string): void {
	map.set(key, (map.get(key) ?? 0) + parseQuantity(delta));
}

export function reconcileInventory(input: ReconcileInput): ReconcileResult {
	const ledgerTotals = new Map<string, number>();
	const reservationTotals = new Map<string, number>();
	const balanceByKey = new Map<string, StockBalance>();
	const keys = new Set<string>();

	for (const entry of input.ledgerEntries) {
		const key = keyFor(entry.warehouseId, entry.itemId);
		keys.add(key);
		addQuantity(ledgerTotals, key, entry.quantityDelta);
	}

	for (const reservation of input.activeReservations) {
		const key = keyFor(reservation.warehouseId, reservation.itemId);
		keys.add(key);
		const remainingQuantity =
			parseQuantity(reservation.quantity) - parseQuantity(reservation.consumedQuantity);
		reservationTotals.set(key, (reservationTotals.get(key) ?? 0) + remainingQuantity);
	}

	for (const balance of input.balances) {
		const key = keyFor(balance.warehouseId, balance.itemId);
		keys.add(key);
		balanceByKey.set(key, balance);
	}

	const findings: string[] = [];
	for (const key of [...keys].sort()) {
		const balance = balanceByKey.get(key);
		if (balance === undefined) {
			const ledgerTotal = ledgerTotals.get(key) ?? 0;
			const reservedTotal = reservationTotals.get(key) ?? 0;
			if (ledgerTotal !== 0 || reservedTotal !== 0) {
				findings.push(
					`Missing balance for ${formatKey(key)} (ledger=${ledgerTotal}, reserved=${reservedTotal})`,
				);
			}
			continue;
		}

		const expectedOnHand = String(ledgerTotals.get(key) ?? 0);
		if (!sameNumericString(balance.onHand, expectedOnHand)) {
			findings.push(
				`On-hand mismatch for ${formatKey(key)} (balance=${balance.onHand}, ledger=${expectedOnHand})`,
			);
		}

		const expectedReserved = String(reservationTotals.get(key) ?? 0);
		if (!sameNumericString(balance.reserved, expectedReserved)) {
			findings.push(
				`Reserved mismatch for ${formatKey(key)} (balance=${balance.reserved}, reservations=${expectedReserved})`,
			);
		}

		const expectedAvailable = String(
			parseQuantity(balance.onHand) - parseQuantity(balance.reserved),
		);
		if (!sameNumericString(balance.available, expectedAvailable)) {
			findings.push(
				`Available mismatch for ${formatKey(key)} (balance=${balance.available}, expected=${expectedAvailable})`,
			);
		}
	}

	return findings.length === 0 ? { ok: true } : { ok: false, findings };
}
