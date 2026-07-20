import { createDrizzlePaymentsStore } from "./drizzle-store";
import { reconcilePayments } from "./reconcile";

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

	const store = createDrizzlePaymentsStore();
	const listed = await store.list({
		organizationId,
		page: 1,
		pageSize: 100,
	});
	if (!listed.ok) {
		console.error(listed.message);
		process.exit(1);
	}

	const reconciled = reconcilePayments({ payments: listed.data });
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
