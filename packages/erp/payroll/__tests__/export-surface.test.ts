import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const pkgPath = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../package.json",
);
const indexPath = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../src/index.ts",
);

describe("@afenda/payroll export surface contract", () => {
	it("root barrel exposes intentional public symbols only", async () => {
		const root = await import("../src/index");

		expect(root.PAYROLL_PERMISSION_SETUP_MANAGE).toBe("payroll.setup.manage");
		expect(root.PAYROLL_PERMISSION_RUN_CREATE).toBe("payroll.run.create");
		expect(typeof root.createPayrollCapabilityOptions).toBe("function");
		expect(typeof root.createPayrollCalendar).toBe("function");
		expect(
			(root as Record<string, unknown>).createDrizzlePayrollStore,
		).toBeUndefined();
		expect(
			(root as Record<string, unknown>).createProductionPayrollRunCalculator,
		).toBeUndefined();
		expect((root as Record<string, unknown>).MutationPorts).toBeUndefined();
	}, 45_000);

	it("publishes exactly one permanent root entrypoint", () => {
		const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
			exports?: Record<string, unknown>;
		};

		expect(Object.keys(pkg.exports ?? {})).toEqual(["."]);
	});

	it("keeps implementation and composition internals out of the root barrel", () => {
		const source = readFileSync(indexPath, "utf8");
		expect(source).not.toMatch(
			/PayrollCommandOptions|MutationPorts|createProductionPayrollRunCalculator|createDrizzlePayrollStore|PayrollStore/,
		);
	});
});
