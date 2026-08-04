import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { payrollModuleManifest } from "../src/composition/module.manifest";
import { payrollRunEventsForStatus } from "../src/features/payroll-runs/lifecycle-events";
import {
	PAYROLL_EMISSION_REGISTRY,
	PAYROLL_EMITTED_EVENTS,
} from "../src/kernel/emissions/emission-registry";
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
			...PAYROLL_EMITTED_EVENTS,
		]);
	});

	it("keeps the emission registry in parity with the manifest and lifecycle builders", () => {
		const registryEvents = PAYROLL_EMISSION_REGISTRY.map(({ event }) => event);
		expect(registryEvents).toEqual([...PAYROLL_EMITTED_EVENTS]);
		expect(payrollModuleManifest.events.emits).toEqual(registryEvents);

		const lifecycleEvents = new Set([
			...payrollRunEventsForStatus("draft"),
			...payrollRunEventsForStatus("calculated"),
			...payrollRunEventsForStatus("finalized"),
			...payrollRunEventsForStatus("reversed"),
		]);
		expect([...lifecycleEvents].toSorted()).toEqual(
			[...registryEvents].toSorted(),
		);

		expect(
			PAYROLL_EMISSION_REGISTRY.every((entry) => entry.dispatcher === null),
		).toBe(true);
		expect(new Set(registryEvents).size).toBe(registryEvents.length);
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
