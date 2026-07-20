import { createDrizzleInventoryStore } from "./drizzle-store";
import { reconcileInventory } from "./reconcile";

function readOrganizationId(argv: string[]): string | null {
	for (const arg of argv) {
		if (arg.startsWith("--organizationId=")) {
			const value = arg.slice("--organizationId=".length).trim();
			return value.length > 0 ? value : null;
		}
	}
	return null;
}

async function main(): Promise<void> {
	const organizationId = readOrganizationId(process.argv.slice(2));
	if (organizationId === null) {
		console.error("Missing required --organizationId=<id> argument");
		process.exit(1);
	}

	const store = createDrizzleInventoryStore();
	const [ledgerEntries, balances, activeReservations] = await Promise.all([
		store.listLedgerEntries(organizationId),
		store.listBalances(organizationId),
		store.listActiveReservations(organizationId),
	]);

	if (!ledgerEntries.ok) {
		console.error(ledgerEntries.message);
		process.exit(1);
	}
	if (!balances.ok) {
		console.error(balances.message);
		process.exit(1);
	}
	if (!activeReservations.ok) {
		console.error(activeReservations.message);
		process.exit(1);
	}
	const reconciled = reconcileInventory({
		ledgerEntries: ledgerEntries.data,
		balances: balances.data,
		activeReservations: activeReservations.data,
	});

	if (reconciled.ok) {
		console.log("Pass");
		return;
	}

	for (const finding of reconciled.findings) {
		console.error(finding);
	}
	process.exit(1);
}

await main();
