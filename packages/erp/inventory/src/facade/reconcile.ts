import { parseQuantity } from "../features/movements/movements.store";
import type { StockBalance } from "../kernel/contracts/domain";

interface ReconcileLedgerEntry {
	itemId: string;
	quantityDelta: string;
	warehouseId: string;
}

interface ReconcileReservation {
	consumedQuantity: string;
	itemId: string;
	quantity: string;
	warehouseId: string;
}

interface ReconcileInput {
	activeReservations: ReconcileReservation[];
	balances: StockBalance[];
	ledgerEntries: ReconcileLedgerEntry[];
}

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

function addQuantity(
	map: Map<string, number>,
	key: string,
	delta: string,
): void {
	map.set(key, (map.get(key) ?? 0) + parseQuantity(delta));
}

function findBalanceDrift(
	key: string,
	balance: StockBalance | undefined,
	ledgerTotal: number,
	reservedTotal: number,
): string[] {
	if (balance === undefined) {
		return ledgerTotal === 0 && reservedTotal === 0
			? []
			: [
					`Missing balance for ${formatKey(key)} (ledger=${ledgerTotal}, reserved=${reservedTotal})`,
				];
	}

	const findings: string[] = [];
	const expectedOnHand = String(ledgerTotal);
	if (!sameNumericString(balance.onHand, expectedOnHand)) {
		findings.push(
			`On-hand mismatch for ${formatKey(key)} (balance=${balance.onHand}, ledger=${expectedOnHand})`,
		);
	}

	const expectedReserved = String(reservedTotal);
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
	return findings;
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
			parseQuantity(reservation.quantity) -
			parseQuantity(reservation.consumedQuantity);
		reservationTotals.set(
			key,
			(reservationTotals.get(key) ?? 0) + remainingQuantity,
		);
	}

	for (const balance of input.balances) {
		const key = keyFor(balance.warehouseId, balance.itemId);
		keys.add(key);
		balanceByKey.set(key, balance);
	}

	const findings: string[] = [];
	for (const key of [...keys].sort()) {
		findings.push(
			...findBalanceDrift(
				key,
				balanceByKey.get(key),
				ledgerTotals.get(key) ?? 0,
				reservationTotals.get(key) ?? 0,
			),
		);
	}

	return findings.length === 0 ? { ok: true } : { ok: false, findings };
}
