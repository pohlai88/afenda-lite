import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { humanResourcesModuleManifest } from "../src/module.manifest";
import { HUMAN_RESOURCES_MUTATION_TABLES } from "../src/mutation-tables";
import { HUMAN_RESOURCES_PERMISSION_CODES } from "../src/permissions";

const pkgPath = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../package.json",
);

describe("humanResourcesModuleManifest", () => {
	it("declares scratch mutation tables and permissions", () => {
		expect(humanResourcesModuleManifest.lifecycle).toBe("scaffolded");
		expect(humanResourcesModuleManifest.persistence.mutationTables).toEqual([
			...HUMAN_RESOURCES_MUTATION_TABLES,
		]);
		expect(humanResourcesModuleManifest.permissions.codes).toEqual([
			...HUMAN_RESOURCES_PERMISSION_CODES,
		]);
		expect(humanResourcesModuleManifest.events.emits).toHaveLength(16);
		expect(humanResourcesModuleManifest.owns.commands).toEqual([
			"human-resources.employee.create",
		]);
		expect(humanResourcesModuleManifest.owns.queries).toEqual([
			"human-resources.employee.get",
		]);
	});

	it("does not depend on payroll package import", () => {
		const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
			dependencies?: Record<string, string>;
		};
		expect(pkg.dependencies?.["@afenda/payroll"]).toBeUndefined();
	});
});
