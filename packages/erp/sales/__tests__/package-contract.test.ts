import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SALES_EVENT_IDS } from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";
import { salesModuleManifest } from "../src/composition/module.manifest";
import { SALES_COMMAND_IDS, SALES_QUERY_IDS } from "../src/module-ids";
import { SALES_PERMISSION_CODES } from "../src/permissions";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("Sales package contract", () => {
	it("declares only the approved public export surfaces", () => {
		const packageJson = JSON.parse(
			readFileSync(join(packageRoot, "package.json"), "utf8"),
		) as { exports: Record<string, unknown> };
		expect(Object.keys(packageJson.exports)).toEqual([
			".",
			"./adapters/drizzle",
			"./testing",
			"./module-manifest",
		]);
	});

	it("keeps manifest commands, queries, permissions, events and tables in parity", () => {
		expect(salesModuleManifest.owns.commands).toEqual(SALES_COMMAND_IDS);
		expect(salesModuleManifest.owns.queries).toEqual(SALES_QUERY_IDS);
		expect(salesModuleManifest.permissions.codes).toEqual(
			SALES_PERMISSION_CODES,
		);
		expect(salesModuleManifest.events.emits).toEqual(SALES_EVENT_IDS);
		expect(salesModuleManifest.persistence.mutationTables).toHaveLength(10);
	});

	it("has no peer transactional ERP import in production source", () => {
		const packageJson = readFileSync(join(packageRoot, "package.json"), "utf8");
		for (const peer of [
			"@afenda/inventory",
			"@afenda/fulfillment",
			"@afenda/receivables",
			"@afenda/accounting",
			"@afenda/purchasing",
		]) {
			expect(packageJson).not.toContain(peer);
		}
	});
});
