import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { payrollModuleManifest } from "../src/module.manifest";
import { PAYROLL_MUTATION_TABLES } from "../src/mutation-tables";
import { PAYROLL_PERMISSION_CODES } from "../src/permissions";

const pkgPath = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../package.json",
);

describe("payrollModuleManifest", () => {
	it("declares scratch mutation tables and permissions", () => {
		expect(payrollModuleManifest.lifecycle).toBe("scaffolded");
		expect(payrollModuleManifest.persistence.mutationTables).toEqual([
			...PAYROLL_MUTATION_TABLES,
		]);
		expect(payrollModuleManifest.permissions.codes).toEqual([
			...PAYROLL_PERMISSION_CODES,
		]);
		expect(payrollModuleManifest.events.emits).toHaveLength(7);
		expect(payrollModuleManifest.moduleDependencies.required).toEqual([
			"human-resources",
		]);
	});

	it("does not import human-resources as workspace dependency", () => {
		const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
			dependencies?: Record<string, string>;
		};
		expect(pkg.dependencies?.["@afenda/human-resources"]).toBeUndefined();
	});
});
