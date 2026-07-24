import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const pkgPath = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../package.json",
);

describe("@afenda/payroll export surface contract", () => {
	it("root barrel exposes intentional public symbols only", async () => {
		const root = await import("../src/index");

		expect(root.PAYROLL_PERMISSION_SETUP_MANAGE).toBe("payroll.setup.manage");
		expect(root.PAYROLL_PERMISSION_RUN_CREATE).toBe("payroll.run.create");
		expect(root.payrollTenantContextSchema).toBeDefined();
		expect(root.payrollMutationContextSchema).toBeDefined();
		expect(root.PAYROLL_ERROR_CODES).toBeDefined();

		expect(
			(root as Record<string, unknown>).createDrizzlePayrollStore,
		).toBeUndefined();
	}, 45_000);

	it("declares documented package.json export subpaths", () => {
		const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
			exports?: Record<string, unknown>;
		};

		expect(pkg.exports?.["."]).toBeDefined();
		expect(pkg.exports?.["./adapters/drizzle"]).toBeDefined();
		expect(pkg.exports?.["./module-manifest"]).toBeDefined();
		expect(pkg.exports?.["./schemas"]).toBeDefined();
		expect(pkg.exports?.["./store"]).toBeDefined();
		expect(pkg.exports?.["./testing"]).toBeDefined();
	});

	it("keeps drizzle store factory on adapters subpath only", async () => {
		const drizzle = await import("../src/adapters/drizzle/index");

		expect(typeof drizzle.createDrizzlePayrollStore).toBe("function");
	}, 45_000);
});
