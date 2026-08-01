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

import { payrollModuleManifest } from "../src/module.manifest";
import { PAYROLL_COMMAND_IDS, PAYROLL_QUERY_IDS } from "../src/module-ids";
import { PAYROLL_MUTATION_TABLES } from "../src/mutation-tables";
import { PAYROLL_PERMISSION_CODES } from "../src/permissions";

const pkgPath = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../package.json",
);

describe("payrollModuleManifest", () => {
	it("declares scratch mutation tables and permissions", () => {
		expect(payrollModuleManifest.lifecycle).toBe("active");
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

	it("keeps owns lists aligned with module id registries", () => {
		expect(payrollModuleManifest.owns.commands).toEqual([
			...PAYROLL_COMMAND_IDS,
		]);
		expect(payrollModuleManifest.owns.queries).toEqual([...PAYROLL_QUERY_IDS]);
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

	it("maps every command and query id to a declared permission", () => {
		const permissionSet = new Set<string>(PAYROLL_PERMISSION_CODES);

		for (const commandId of PAYROLL_COMMAND_IDS) {
			const permission =
				payrollModuleManifest.authorization.commands[commandId];
			expect(permission, `missing auth for command ${commandId}`).toBeTruthy();
			expect(permissionSet.has(permission)).toBe(true);
		}

		for (const queryId of PAYROLL_QUERY_IDS) {
			const permission = payrollModuleManifest.authorization.queries[queryId];
			expect(permission, `missing auth for query ${queryId}`).toBeTruthy();
			expect(permissionSet.has(permission)).toBe(true);
		}
	});

	it("does not import human-resources as workspace dependency", () => {
		const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
			dependencies?: Record<string, string>;
		};
		expect(pkg.dependencies?.["@afenda/human-resources"]).toBeUndefined();
	});
});
