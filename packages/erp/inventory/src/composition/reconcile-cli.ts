import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { reconcileInventory } from "../facade/reconcile";
import { createDrizzleInventoryStore } from "../features/movements/movements.drizzle";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(packageRoot, "../../..");
const LINE_BREAK_PATTERN = /\r?\n/;
const ENV_ASSIGNMENT_PATTERN = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/;

/** Load repo-root `.env.local` when DATABASE_URL is unset (ops CLI; matches @afenda/db scripts). */
function loadEnvLocal(): void {
	if (process.env.DATABASE_URL) {
		return;
	}
	const envPath = join(repoRoot, ".env.local");
	if (!existsSync(envPath)) {
		return;
	}
	const text = readFileSync(envPath, "utf8");
	for (const line of text.split(LINE_BREAK_PATTERN)) {
		const trimmed = line.trim();
		if (trimmed.length === 0 || trimmed.startsWith("#")) {
			continue;
		}
		const match = ENV_ASSIGNMENT_PATTERN.exec(trimmed);
		if (match === null) {
			continue;
		}
		const [, key, rawValue] = match;
		if (key === undefined) {
			continue;
		}
		let value = rawValue?.trim() ?? "";
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		if (process.env[key] === undefined) {
			process.env[key] = value;
		}
	}
}

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
	loadEnvLocal();
	if (
		!process.env.DATABASE_URL ||
		process.env.DATABASE_URL.trim().length === 0
	) {
		console.error(
			"@afenda/inventory reconcile DENIED: DATABASE_URL is required (env or repo-root .env.local)",
		);
		process.exit(1);
	}

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
