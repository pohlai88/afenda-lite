import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	PAYROLL_PAYMENT_CORRECTION_REQUESTED_EVENT,
	PAYROLL_PAYMENT_REQUESTED_EVENT,
	PAYROLL_POSTING_CORRECTION_REQUESTED_EVENT,
	PAYROLL_POSTING_REQUESTED_EVENT,
	PAYROLL_RUN_CALCULATED_EVENT,
	PAYROLL_RUN_FINALIZED_EVENT,
	PAYROLL_RUN_REVERSED_EVENT,
	PAYROLL_RUN_STARTED_EVENT,
} from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";

import { payrollModuleManifest } from "../src/composition/module.manifest";
import { PAYROLL_MUTATION_TABLES } from "../src/kernel/emissions/mutation-tables";
import { PAYROLL_PERMISSION_CODES } from "../src/kernel/execution/permissions";

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
		expect(payrollModuleManifest.moduleDependencies.required).toEqual([
			"human-resources",
		]);
	});

	it("declares only events emitted by implemented lifecycle operations", () => {
		expect(payrollModuleManifest.events.emits).toEqual([
			PAYROLL_RUN_STARTED_EVENT,
			PAYROLL_RUN_CALCULATED_EVENT,
			PAYROLL_RUN_FINALIZED_EVENT,
			PAYROLL_RUN_REVERSED_EVENT,
			PAYROLL_PAYMENT_REQUESTED_EVENT,
			PAYROLL_POSTING_REQUESTED_EVENT,
			PAYROLL_PAYMENT_CORRECTION_REQUESTED_EVENT,
			PAYROLL_POSTING_CORRECTION_REQUESTED_EVENT,
		]);
	});

	it("keeps permission codes unique", () => {
		expect(new Set(PAYROLL_PERMISSION_CODES).size).toBe(
			PAYROLL_PERMISSION_CODES.length,
		);
	});

	it("does not import human-resources as workspace dependency", () => {
		const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
			dependencies?: Record<string, string>;
		};
		expect(pkg.dependencies?.["@afenda/human-resources"]).toBeUndefined();
	});
});
